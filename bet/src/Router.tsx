import React from "react";
import { BrowserRouter, Routes, Route,  Navigate  } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/login";
import Layout from "./components/Layout";
import Cadastro from "./pages/Cadastro"
import VerificarCodigo from "./pages/VerificarCodigo";
import Criar_usuario from "./pages/Criarusuario";
import { useAuth } from './contexts/AuthContext';

// Componente de rota privada (protegida)
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken } = useAuth();
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
};

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/*rotas públicas*/}
        <Route element={<Layout />}>
        
          <Route path="/" element={<Home />} />
          
          {/*rotas privadas ainda não descidi quais serão essa*/}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            } 
          />
          
        </Route>

        {/*rotas sem o header como padrão*/}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/verificar" element={<VerificarCodigo />} />
        <Route path="/criarUsuario" element={<Criar_usuario />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;