import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Coins, Wallet, Pencil, LogOut, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { showError, showSuccess } from '../../utils/alertUtils';
import styles from './Perfil.module.css';

interface PerfilUsuario {
  _id: string;
  nome: string;
  username: string;
  email: string;
  chavePix?: string;
  telefone?: string;
}

interface CarteiraInfo {
  saldoBetHot: number;
  saldoHotcoin: number;
  saldoBloqueadoBetHot: number;
}

export default function Perfil() {
  const { fetchWithAuth, logout } = useAuth();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<PerfilUsuario | null>(null);
  const [carteira, setCarteira] = useState<CarteiraInfo | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [email, setEmail] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [quantidadeConverter, setQuantidadeConverter] = useState('');
  const [convertendo, setConvertendo] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      const [perfilRes, carteiraRes] = await Promise.all([
        fetchWithAuth('/api/auth/perfil'),
        fetchWithAuth('/api/carteira'),
      ]);
      const perfilData = await perfilRes.json();
      const carteiraData = await carteiraRes.json();
      if (!perfilRes.ok) throw new Error(perfilData.erro || 'Erro ao carregar perfil');
      setUsuario(perfilData);
      setEmail(perfilData.email || '');
      setChavePix(perfilData.chavePix || '');
      if (carteiraRes.ok) setCarteira(carteiraData);
    } catch (err: any) {
      await showError('Erro ao carregar', err.message);
    } finally {
      setCarregando(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const res = await fetchWithAuth('/api/auth/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ email, chavePix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar');
      setUsuario(data);
      setEmail(data.email || '');
      setChavePix(data.chavePix || '');
      setEditando(false);
      await showSuccess('Dados atualizados!');
    } catch (err: any) {
      await showError('Não foi possível salvar', err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleConverter = async () => {
    const qtd = Number(quantidadeConverter);
    if (!qtd || qtd <= 0) {
      await showError('Quantidade inválida', 'Informe quantos BetHot deseja converter.');
      return;
    }
    setConvertendo(true);
    try {
      const res = await fetchWithAuth('/api/carteira/converter', {
        method: 'POST',
        body: JSON.stringify({ quantidadeBetHot: qtd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro na conversão');
      setCarteira((prev) =>
        prev ? { ...prev, saldoBetHot: data.saldoBetHot, saldoHotcoin: data.saldoHotcoin } : prev
      );
      setQuantidadeConverter('');
      await showSuccess('Conversão realizada!', `Você recebeu ${data.hotcoinGanho} Hotcoin.`);
    } catch (err: any) {
      await showError('Não foi possível converter', err.message);
    } finally {
      setConvertendo(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (carregando) {
    return (
      <div className={styles.container}>
        <p className={styles.carregando}>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.topo}>
        <h1 className={styles.titulo}>
          <Flame size={28} /> Minha Conta
        </h1>
        <button className={styles.botaoSair} onClick={handleLogout}>
          <LogOut size={18} /> Sair
        </button>
      </header>

      <section className={styles.grid}>
        {/* Carteira */}
        <article className={styles.card}>
          <div className={styles.cardCabecalho}>
            <h2><Wallet size={20} /> Carteira</h2>
            <button className={styles.iconeBotao} onClick={carregarDados} aria-label="Atualizar saldo">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className={styles.saldos}>
            <div className={styles.saldoItem}>
              <span className={styles.saldoLabel}><Flame size={16} /> BetHot</span>
              <strong className={styles.saldoValor}>{carteira?.saldoBetHot ?? 0}</strong>
            </div>
            <div className={styles.saldoItem}>
              <span className={styles.saldoLabel}><Coins size={16} /> Hotcoin</span>
              <strong className={styles.saldoValor}>{carteira?.saldoHotcoin ?? 0}</strong>
            </div>
          </div>

          <Link to="/comprar" className={styles.botaoPrimario}>
            Comprar BetHot <ArrowRight size={18} />
          </Link>

          <div className={styles.conversao}>
            <h3>Converter BetHot em Hotcoin</h3>
            <p className={styles.dica}>1.000 BetHot = 1 Hotcoin (múltiplos de 1.000)</p>
            <div className={styles.conversaoForm}>
              <input
                type="number"
                min={1000}
                step={1000}
                placeholder="Qtd. BetHot"
                value={quantidadeConverter}
                onChange={(e) => setQuantidadeConverter(e.target.value)}
              />
              <button onClick={handleConverter} disabled={convertendo}>
                {convertendo ? 'Convertendo...' : 'Converter'}
              </button>
            </div>
          </div>
        </article>

        {/* Dados do usuário */}
        <article className={styles.card}>
          <div className={styles.cardCabecalho}>
            <h2>Dados Pessoais</h2>
            {!editando && (
              <button className={styles.iconeBotao} onClick={() => setEditando(true)} aria-label="Editar dados">
                <Pencil size={16} />
              </button>
            )}
          </div>

          <div className={styles.campo}>
            <span className={styles.campoLabel}>Usuário</span>
            <span className={styles.campoValor}>{usuario?.username}</span>
          </div>
          <div className={styles.campo}>
            <span className={styles.campoLabel}>Nome</span>
            <span className={styles.campoValor}>{usuario?.nome}</span>
          </div>

          {editando ? (
            <>
              <label className={styles.campoEdit}>
                <span className={styles.campoLabel}>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className={styles.campoEdit}>
                <span className={styles.campoLabel}>Chave PIX</span>
                <input
                  type="text"
                  value={chavePix}
                  placeholder="Informe sua chave PIX"
                  onChange={(e) => setChavePix(e.target.value)}
                />
              </label>
              <div className={styles.acoesEdit}>
                <button className={styles.botaoPrimario} onClick={handleSalvar} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  className={styles.botaoSecundario}
                  onClick={() => {
                    setEditando(false);
                    setEmail(usuario?.email || '');
                    setChavePix(usuario?.chavePix || '');
                  }}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.campo}>
                <span className={styles.campoLabel}>Email</span>
                <span className={styles.campoValor}>{usuario?.email}</span>
              </div>
              <div className={styles.campo}>
                <span className={styles.campoLabel}>Chave PIX</span>
                <span className={styles.campoValor}>{usuario?.chavePix || 'Não informada'}</span>
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
