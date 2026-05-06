import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import logoUrl from "../assets/logo.png";

const linkClass = ({ isActive }) =>
  `nav-link ${isActive ? "nav-link-active" : ""}`;

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">

         <img className="brand-logo" src={logoUrl} alt="Logo" width={90} height={90} decoding="async" />
          <div>
            
            {/* <div className="brand-title">D Hotel</div> */}
            <div className="brand-sub ">Operações &amp; reservas</div>
            <br />
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={linkClass}>
            Painel
          </NavLink>
          <NavLink to="/quartos" className={linkClass}>
            Quartos
          </NavLink>
          <NavLink to="/hospedes" className={linkClass}>
            Hóspedes
          </NavLink>
          <NavLink to="/reservas" className={linkClass}>
            Reservas
          </NavLink>
          <NavLink to="/alertas" className={linkClass}>
            Alertas
          </NavLink>
          <NavLink to="/historico" className={linkClass}>
            Histórico
          </NavLink>
          <NavLink to="/config" className={linkClass}>
            Limites de alerta
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-name">{user?.name}</div>
            <div className="user-meta">{user?.email}</div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
