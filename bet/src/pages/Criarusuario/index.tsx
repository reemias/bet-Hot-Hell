import { useState, useEffect , useCallback } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { debounce } from "lodash";
import {
  User,
  Calendar,
  Lock,
  KeyRound,
  CoinsIcon,
  CheckCircle,
  XCircle,
  CreditCard,
  Loader2,
} from "lucide-react";
import { showError, showSuccess, showLoading, closeLoading } from "../../utils/alertUtils";
import style from "./CriarUsuario.module.css";
import imagem from "../../img/Sabão em pó.png";

function CriarUsuario() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  // Estados para validação assíncrona (adicionados sem conflito)
  const [usernameDisponivel, setUsernameDisponivel] = useState<boolean | null>(null);
  const [pixDisponivel, setPixDisponivel] = useState<boolean | null>(null);
  const [verificandoUsername, setVerificandoUsername] = useState(false);
  const [verificandoPix, setVerificandoPix] = useState(false);

  const token = localStorage.getItem("cadastroToken");

  useEffect(() => {
    if (!token) {
      navigate("/cadastro");
    }
  }, [token, navigate]);


  // Debounce para verificar username
  const verificarUsername = useCallback(
    debounce(async (valor: string) => {
      if (valor.length < 3) {
        setUsernameDisponivel(null);
        return;
      }
      setVerificandoUsername(true);
      try {
        const res = await fetch(`http://localhost:5000/api/cadastro/check-disponibilidade?username=${encodeURIComponent(valor)}`);
        const data = await res.json();
        setUsernameDisponivel(data.campos?.username ?? false);
      } catch {
        setUsernameDisponivel(false);
      } finally {
        setVerificandoUsername(false);
      }
    }, 500),
    []
  );

  // Debounce para verificar chave PIX
  const verificarPix = useCallback(
    debounce(async (valor: string) => {
      if (valor.length < 3) {
        setPixDisponivel(null);
        return;
      }
      setVerificandoPix(true);
      try {
        const res = await fetch(`http://localhost:5000/api/cadastro/check-disponibilidade?chavePix=${encodeURIComponent(valor)}`);
        const data = await res.json();
        setPixDisponivel(data.campos?.chavePix ?? false);
      } catch {
        setPixDisponivel(false);
      } finally {
        setVerificandoPix(false);
      }
    }, 500),
    []
  );

  // Handlers com verificação
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setUsername(valor);
    verificarUsername(valor);
  };

  const handlePixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setChavePix(valor);
    if (valor.length >= 3) verificarPix(valor);
    else setPixDisponivel(null);
  };

  // Validação do formulário para habilitar o botão (AGORA inclui username e PIX disponíveis)
  const isFormValid = () => {
    const usernameOk = username.trim() !== "" && usernameDisponivel === true;
    const pixOk = chavePix === "" || pixDisponivel === true;
    return (
      usernameOk &&
      dataNascimento !== "" &&
      senha.length >= 6 &&
      confirmarSenha !== "" &&
      senha === confirmarSenha &&
      pixOk
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      await showError("Campo obrigatório", "Username é obrigatório.");
      return;
    }
    if (usernameDisponivel === false) {
      await showError("Username indisponível", "Este username já está em uso.");
      return;
    }
    if (!dataNascimento) {
      await showError("Campo obrigatório", "Data de nascimento é obrigatória.");
      return;
    }
    if (senha.length < 6) {
      await showError("Senha fraca", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      await showError("Senhas diferentes", "As senhas não coincidem.");
      return;
    }
    if (chavePix && pixDisponivel === false) {
      await showError("Chave PIX indisponível", "Esta chave PIX já está cadastrada por outro usuário.");
      return;
    }

    setLoading(true);
    showLoading("Criando sua conta...");

    try {
      const response = await fetch("http://localhost:5000/api/cadastro/completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          username: username.trim().slice(0, 30),
          dataNascimento,
          senha: senha.slice(0, 128),
          chavePix: chavePix.trim().slice(0, 50) || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.erro || "Erro ao completar cadastro");
      }

      localStorage.removeItem("cadastroToken");
      localStorage.removeItem("cadastroUserId");
      closeLoading();
      await showSuccess("Cadastro concluído!", "Agora você pode fazer login.");
      navigate("/login");
    } catch (err: any) {
      closeLoading();
      await showError("Falha no cadastro", err.message);
    } finally {
      setLoading(false);
    }
  };

  const hoje = new Date();
  const dataMinima = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate())
    .toISOString()
    .split("T")[0];

  // Ícone de confirmação de senha
  const passwordMatchIcon = 
    confirmarSenha && senha === confirmarSenha ? (
      <CheckCircle size={18} className={style.checkIcon} />
    ) : confirmarSenha ? (
      <XCircle size={18} className={style.xIcon} />
    ) : null;

  return (
    <div className={style.container}>
      <div className={style.imageArea}>
        <img src={imagem} className={style.image} alt="Sabão em pó" />
        <span>Hot-Hell</span>
      </div>
      <div className={style.formArea}>
        <form className={style.form} onSubmit={handleSubmit}>
          <h2 className={style.title}>
            <p className={style.titleIcon}> Crie seu usuário <CoinsIcon size={32} /></p>
          </h2>

          {/* Username com verificação */}
          <div className={style.inputGroup}>
            <User size={20} className={style.inputIcon} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={handleUsernameChange}
              required
              disabled={loading}
            />
            {verificandoUsername && <Loader2 size={18} className={style.spinner} />}
            {!verificandoUsername && usernameDisponivel === true && <CheckCircle size={18} className={style.checkIcon} />}
            {!verificandoUsername && usernameDisponivel === false && <XCircle size={18} className={style.xIcon} />}
          </div>

          <div className={style.inputGroup}>
            <Calendar size={20} className={style.inputIcon} />
            <input
              type="date"
              placeholder="Data de Nascimento"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              max={dataMinima}
              required
              disabled={loading}
            />
          </div>

          <div className={style.inputGroup}>
            <Lock size={20} className={style.inputIcon} />
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Senha (mínimo 6 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className={style.eyeButton}
              onClick={() => setMostrarSenha(!mostrarSenha)}
              tabIndex={-1}
            >
              {mostrarSenha ? <KeyRound size={18} /> : <Lock size={18} />}
            </button>
          </div>

          <div className={style.inputGroup}>
            <KeyRound size={20} className={style.inputIcon} />
            <input
              type={mostrarConfirmar ? "text" : "password"}
              placeholder="Confirmar senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className={style.eyeButton}
              onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
              tabIndex={-1}
            >
              {mostrarConfirmar ? <KeyRound size={18} /> : <Lock size={18} />}
            </button>
            {passwordMatchIcon && (
              <span className={style.matchIcon}>{passwordMatchIcon}</span>
            )}
          </div>

          {/* Chave PIX com verificação */}
          <div className={style.inputGroup}>
            <CreditCard size={20} className={style.inputIcon} />
            <input
              type="text"
              placeholder="Chave PIX (opcional)"
              value={chavePix}
              onChange={handlePixChange}
              disabled={loading}
            />
            {verificandoPix && <Loader2 size={18} className={style.spinner} />}
            {!verificandoPix && chavePix && pixDisponivel === true && <CheckCircle size={18} className={style.checkIcon} />}
            {!verificandoPix && chavePix && pixDisponivel === false && <XCircle size={18} className={style.xIcon} />}
          </div>

          <button
            type="submit"
            className={`${style.button} ${!isFormValid() ? style.buttonDisabled : ""}`}
            disabled={!isFormValid() || loading}
          >
            {loading ? "Cadastrando..." : "Cadastrar-se"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CriarUsuario;