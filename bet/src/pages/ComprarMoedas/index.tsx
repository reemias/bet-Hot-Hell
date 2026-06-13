import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { showError, showSuccess } from '../../utils/alertUtils';
import styles from './ComprarMoedas.module.css';

const BETHOT_POR_BRL = 50; // R$1 = 50 BetHot (apenas exibição; backend é a fonte da verdade)
const VALOR_MINIMO = 10;

interface PixGerado {
  pedidoId: string;
  qrcode?: string;
  qrcodeImagem?: string;
  betHotAmount: number;
  valorBRL: number;
}

export default function ComprarMoedas() {
  const { fetchWithAuth } = useAuth();
  const navigate = useNavigate();

  const [valor, setValor] = useState('');
  const [gerando, setGerando] = useState(false);
  const [pix, setPix] = useState<PixGerado | null>(null);
  const [status, setStatus] = useState<'aguardando' | 'concluido' | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const limparPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => limparPolling(), []);

  const valorNum = Number(valor) || 0;
  const betHotPrevisto = Math.floor(valorNum * BETHOT_POR_BRL);

  const handleGerar = async () => {
    if (valorNum < VALOR_MINIMO) {
      await showError('Valor muito baixo', `O valor mínimo é R$${VALOR_MINIMO}.`);
      return;
    }
    setGerando(true);
    setStatus(null);
    try {
      const res = await fetchWithAuth('/api/compras/criar-pix', {
        method: 'POST',
        body: JSON.stringify({ valorBRL: valorNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao gerar PIX');
      setPix(data);
      setStatus('aguardando');
      iniciarPolling(data.pedidoId);
    } catch (err: any) {
      await showError('Não foi possível gerar o PIX', err.message);
    } finally {
      setGerando(false);
    }
  };

  const iniciarPolling = (pedidoId: string) => {
    limparPolling();
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`/api/compras/status/${pedidoId}`);
        const data = await res.json();
        if (res.ok && data.status === 'concluido') {
          limparPolling();
          setStatus('concluido');
          await showSuccess('Pagamento confirmado!', 'Seus BetHot foram creditados.');
        }
      } catch {
        // silencioso: continua tentando
      }
    }, 4000);
  };

  const copiarCodigo = async () => {
    if (!pix?.qrcode) return;
    try {
      await navigator.clipboard.writeText(pix.qrcode);
      await showSuccess('Código copiado!');
    } catch {
      await showError('Não foi possível copiar');
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.voltar} onClick={() => navigate('/perfil')}>
        <ArrowLeft size={18} /> Voltar ao perfil
      </button>

      <h1 className={styles.titulo}>
        <Flame size={26} /> Comprar BetHot
      </h1>

      {!pix && (
        <div className={styles.card}>
          <label className={styles.label}>Valor em reais (R$)</label>
          <input
            type="number"
            min={VALOR_MINIMO}
            step={1}
            placeholder={`Mínimo R$${VALOR_MINIMO}`}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />

          <p className={styles.previsao}>
            Você receberá <strong>{betHotPrevisto.toLocaleString('pt-BR')}</strong> BetHot
          </p>

          <button className={styles.botaoPrimario} onClick={handleGerar} disabled={gerando}>
            <QrCode size={18} /> {gerando ? 'Gerando...' : 'Gerar QR Code PIX'}
          </button>
        </div>
      )}

      {pix && status === 'aguardando' && (
        <div className={styles.card}>
          <div className={styles.statusAguardando}>Aguardando pagamento...</div>
          <p className={styles.resumo}>
            R${pix.valorBRL} → <strong>{pix.betHotAmount.toLocaleString('pt-BR')}</strong> BetHot
          </p>

          {pix.qrcodeImagem && (
            <img className={styles.qrImagem} src={pix.qrcodeImagem} alt="QR Code PIX" />
          )}

          {pix.qrcode && (
            <div className={styles.copiaCola}>
              <code className={styles.codigo}>{pix.qrcode}</code>
              <button className={styles.botaoSecundario} onClick={copiarCodigo}>
                <Copy size={16} /> Copiar
              </button>
            </div>
          )}

          <p className={styles.dica}>
            Após o pagamento, o saldo é creditado automaticamente. Esta tela atualiza sozinha.
          </p>
        </div>
      )}

      {status === 'concluido' && (
        <div className={styles.card}>
          <div className={styles.sucesso}>
            <CheckCircle2 size={48} />
            <h2>Pagamento confirmado!</h2>
            <p>Seus BetHot já estão disponíveis na carteira.</p>
            <button className={styles.botaoPrimario} onClick={() => navigate('/perfil')}>
              Ver minha carteira
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
