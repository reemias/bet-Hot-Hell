import { useState, useEffect, useRef } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, User, Mail, Hash, Phone, Loader2 } from "lucide-react";
import { showError, showSuccess, showLoading, closeLoading } from "../../utils/alertUtils";
import style from "./Cadastro.module.css";
import Devil from "../../img/devil256_icon-icons.com_76056.ico";
import Recaptcha from "../../img/google_recaptcha_official_logo_icon_169077.ico";

function TypewriterText({ text, speed = 120 }: { text: string; speed?: number }) {
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showShine, setShowShine] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayText("");
    setIsTyping(true);
    setShowShine(false);

    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setShowShine(true);
        setTimeout(() => setShowShine(false), 800);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  useEffect(() => {
    if (paragraphRef.current) {
      if (isTyping) paragraphRef.current.classList.add("typing");
      else paragraphRef.current.classList.remove("typing");
      if (showShine) paragraphRef.current.classList.add("shine-effect");
      else paragraphRef.current.classList.remove("shine-effect");
    }
  }, [isTyping, showShine]);

  return <p ref={paragraphRef}>{displayText}</p>;
}

function CaptchaCheckbox({ checked, onChange }: { checked: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  const [verificando, setVerificando] = useState(false);

  const handleCheckboxChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (verificando || checked) return;
    setVerificando(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const eventoSintetico = { ...e, target: { ...e.target, checked: true } };
    onChange(eventoSintetico as ChangeEvent<HTMLInputElement>);
    setVerificando(false);
  };

  return (
    <div className={style.captchaContainer}>
      <div className={style.captchaCheckbox}>
        {!verificando ? (
          <input type="checkbox" id="Robo" checked={checked} onChange={handleCheckboxChange} disabled={verificando} required />
        ) : (
          <div className={style.spinner}></div>
        )}
        <label htmlFor="Robo" style={{ opacity: verificando ? 0.6 : 1 }}>
          {verificando ? "Verificando..." : "Não sou um robô"}
        </label>
      </div>
      <div className={style.captchaBranding}>
        <img src={Recaptcha} alt="reCAPTCHA" />
        <span>Privacidade - Termos</span>
      </div>
    </div>
  );
}

function FormeCadastro({
  nome, email, cpf, telefone, termos, robo,
  onNomeChange, onEmailChange, onCpfChange, onTelefoneChange,
  onTermosChange, onRoboChange, onSubmit, isValid, loading,
}: {
  nome: string; email: string; cpf: string; telefone: string;
  termos: boolean; robo: boolean;
  onNomeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onCpfChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTelefoneChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTermosChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRoboChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent) => void;
  isValid: boolean;
  loading: boolean;
}) {
  const formatarCPF = (valor: string): string => {
    const apenasNumeros = valor.replace(/\D/g, "");
    if (apenasNumeros.length <= 3) return apenasNumeros;
    if (apenasNumeros.length <= 6) return apenasNumeros.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    if (apenasNumeros.length <= 9) return apenasNumeros.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4").slice(0, 14);
  };

  const formatarTelefone = (valor: string): string => {
    let apenasNumeros = valor.replace(/\D/g, "").slice(0, 11);
    if (apenasNumeros.length <= 2) return apenasNumeros;
    if (apenasNumeros.length <= 6) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
    if (apenasNumeros.length <= 10) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 3)} ${apenasNumeros.slice(3, 7)}-${apenasNumeros.slice(7)}`;
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 3)} ${apenasNumeros.slice(3, 7)}-${apenasNumeros.slice(7, 11)}`;
  };

  const handleCpfChange = (e: ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCPF(e.target.value);
    onCpfChange({ ...e, target: { ...e.target, value: valorFormatado } } as ChangeEvent<HTMLInputElement>);
  };

  const handleTelefoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value);
    onTelefoneChange({ ...e, target: { ...e.target, value: valorFormatado } } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <form className={style.Formulario_Cadastro_primeira_sessao} onSubmit={onSubmit}>
      <div className={style.inputGroup}>
        <User size={20} className={style.inputIcon} />
        <input type="text" placeholder="Nome Completo" value={nome} onChange={onNomeChange} required />
      </div>
      <div className={style.inputGroup}>
        <Mail size={20} className={style.inputIcon} />
        <input type="email" placeholder="Email" value={email} onChange={onEmailChange} required />
      </div>
      <div className={style.inputGroup}>
        <Hash size={20} className={style.inputIcon} />
        <input type="text" placeholder="CPF" value={cpf} onChange={handleCpfChange} required />
      </div>
      <div className={style.inputGroup}>
        <Phone size={20} className={style.inputIcon} />
        <input type="tel" placeholder="(DDD) 9 XXXX-XXXX" value={telefone} onChange={handleTelefoneChange} required />
      </div>

      <div className={style.termos_e_condicoes}>
        <div>
          <input type="checkbox" id="termos" checked={termos} onChange={onTermosChange} required />
          <label htmlFor="termos">
            Aceito os <a href="/termos" target="_blank">termos</a> e <a href="/condicoes" target="_blank">condições</a>
          </label>
        </div>
        <CaptchaCheckbox checked={robo} onChange={onRoboChange} />
      </div>

      <button type="submit" disabled={!isValid || loading}>
        {loading ? <Loader2 size={18} className={style.spinnerBtn} /> : "Próximo"}
      </button>
    </form>
  );
}

function Cadastro() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [termos, setTermos] = useState(false);
  const [robo, setRobo] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = nome.trim() !== "" && email.trim() !== "" && cpf.trim() !== "" && telefone.trim() !== "" && termos && robo;

  useEffect(() => {
    const token = localStorage.getItem('cadastroToken');
    if (token) navigate('/criarUsuario');
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    showLoading("Enviando dados...");

    try {
      const response = await fetch("http://localhost:5000/api/cadastro/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim().slice(0, 100),
          email: email.trim().slice(0, 100).toLowerCase(),
          cpf: cpf.replace(/\D/g, '').slice(0, 11),
          telefone: telefone.replace(/\D/g, '').slice(0, 11),
          aceite_termos: termos,
          nao_robo: robo,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Erro ao enviar dados");

      localStorage.setItem("cadastroPendenteId", data.cadastroId);
      closeLoading();
      await showSuccess("Código enviado!", "Verifique seu e-mail e insira o código.");
      navigate("/verificar");
    } catch (err: any) {
      closeLoading();
      await showError("Falha no cadastro", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={style.componenteCadastro}>
      <div className={style.ContainerInternoCadastro}>
        <div className={style.Esqueda}>
          <Flame size={32} />
          <span>Bet HoT-Hell</span>
          <TypewriterText text="Faça sua conta e realize seus desejos" speed={120} />
        </div>
        <div className={style.Direita}>
          <div className={style.Parte_de_cima_Cadastro}>
            <h1>Cadastre-se aqui</h1>
            <img src={Devil} alt="diabo" />
          </div>
          <FormeCadastro
            nome={nome} email={email} cpf={cpf} telefone={telefone}
            termos={termos} robo={robo}
            onNomeChange={(e) => setNome(e.target.value)}
            onEmailChange={(e) => setEmail(e.target.value)}
            onCpfChange={(e) => setCpf(e.target.value)}
            onTelefoneChange={(e) => setTelefone(e.target.value)}
            onTermosChange={(e) => setTermos(e.target.checked)}
            onRoboChange={(e) => setRobo(e.target.checked)}
            onSubmit={handleSubmit} isValid={isValid} loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

export default Cadastro;