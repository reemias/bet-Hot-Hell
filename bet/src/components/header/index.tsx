// Header.jsx
import { useState } from "react";
import { Flame, LogIn, Menu, X } from "lucide-react";
import style from "./Header.module.css";
import { Link } from "react-router-dom";

function Header() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className={style.ContainerHeader}>
      {/* Menu para DESKTOP: sempre visível */}
      <div className={style.DesktopNav}>
        <Link to="/">Home</Link>
        <Link to="/live">Ao Vivo</Link>
        <Link to="/casino">Cassino</Link>
        <Link to="/casino/live">Cassino Ao Vivo</Link>
        <Link to="/promocoes">Promoções</Link>
      </div>

      {/* Botão para MOBILE: só aparece em tela pequena */}
      <div className={style.MobileButton}>
        <button onClick={() => setMenuAberto(!menuAberto)}>
          {menuAberto ? <X size={32} /> : <Menu size={32} />}
        </button>
      </div>

      {/* Logo */}
      <div className={style.Logotipo}>
        <Flame size={32} />
        Bet Hotel
      </div>

      {/* Login */}
      <div className={style.Login}>
        <Link to="/Login"><LogIn /> Entrar</Link>
        <Link to="/cadastro">Registrar</Link>
      </div>

      {/* Menu MOBILE que aparece quando clica no botão */}
      {menuAberto && (
        <div className={style.MenuMobile}>
          <Link to="/" onClick={() => setMenuAberto(false)}>Home</Link>
          <Link to="/live" onClick={() => setMenuAberto(false)}>Ao Vivo</Link>
          <Link to="/casino" onClick={() => setMenuAberto(false)}>Cassino</Link>
          <Link to="/casino/live" onClick={() => setMenuAberto(false)}>Cassino Ao Vivo</Link>
          <Link to="/promocoes" onClick={() => setMenuAberto(false)}>Promoções</Link>
        </div>
      )}
    </div>
  );
}

export default Header;