import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import style from './VerificarCodigo.module.css';

function VerificarCodigo() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const cadastroId = localStorage.getItem('cadastroPendenteId');
  const cadastroToken = localStorage.getItem('cadastroToken');

  useEffect(() => {
    if (!cadastroId) {
      if (cadastroToken) {
        navigate('/criarUsuario');
        return;
      }
      navigate('/cadastro');
    }
  }, [cadastroId, cadastroToken, navigate]);

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;

    setLoading(true);
    setErro('');
    setMensagem('');

    try {
      const response = await fetch('http://localhost:5000/api/cadastro/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadastroId, codigo }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Falha na verificação');
      }

      if (!data.token) {
        throw new Error('Token de cadastro não recebido');
      }

      localStorage.setItem('cadastroToken', data.token);
      localStorage.removeItem('cadastroPendenteId');
      setMensagem(data.message || 'Cadastro concluído com sucesso!');
      
      setTimeout(() => navigate('/criarUsuario'), 2000);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReenviar = async () => {
    setLoading(true);
    setErro('');
    try {
      const response = await fetch('http://localhost:5000/api/cadastro/reenviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadastroId }), // ✅ campo correto
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro);
      setMensagem('Novo código enviado para seu e-mail!');
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={style.container}>
      <div className={style.card}>
        <h2>Verifique seu e-mail</h2>
        <p>Enviamos um código de 6 dígitos para o e-mail informado.</p>
        <form onSubmit={handleVerificar}>
          <input
            type="text"
            placeholder="Código de verificação"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            maxLength={6}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Confirmar cadastro'}
          </button>
        </form>
        <div className={style.reenviar}>
          <button type="button" onClick={handleReenviar} disabled={loading}>
            Reenviar código
          </button>
        </div>
        {mensagem && <div className={style.sucesso}>{mensagem}</div>}
        {erro && <div className={style.erro}>{erro}</div>}
      </div>
    </div>
  );
}

export default VerificarCodigo;