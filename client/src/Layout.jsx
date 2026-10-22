import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const MENUS = {
  admin: [
    ["Dashboard", "/"],
    ["Patients", "/patients"],
    ["Doctors", "/doctors"],
    ["Appointments", "/appointments"],
    ["Records", "/records"],
    ["Billing", "/bills"],
    ["Pharmacy", "/medicines"],
    ["Lab", "/lab"],
    ["Wards", "/wards"],
  ],
  receptionist: [
    ["Home", "/"],
    ["Patients", "/patients"],
    ["Appointments", "/appointments"],
    ["Billing", "/bills"],
    ["Wards", "/wards"],
  ],
  doctor: [
    ["Home", "/"],
    ["Patients", "/patients"],
    ["Appointments", "/appointments"],
    ["Records", "/records"],
    ["Lab", "/lab"],
  ],
  patient: [
    ["Home", "/"],
    ["My Appointments", "/appointments"],
    ["My Records", "/records"],
    ["My Bills", "/bills"],
    ["My Lab Reports", "/lab"],
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menu = MENUS[user.role] || MENUS.patient;
  const activePage = menu.find(([, path]) => path === location.pathname)?.[0] || "Dashboard";
  const initials = user.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  const out = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app">
      <aside aria-label="Main navigation" className="sidebar">
        <h3><span aria-hidden="true">+</span><span className="brand-name">MediFlow</span></h3>
        <p className="workspace-label">HOSPITAL WORKSPACE</p>
        <nav aria-label={`${user.role} workspace`} className="sidebar-nav">
          {menu.map(([label, path]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <span aria-hidden="true" className="account-avatar">{initials}</span>
          <span className="account-copy"><strong>{user.name || "Account"}</strong><small>{user.role}</small></span>
        </div>
      </aside>
      <div className="main">
        <header>
          <div className="header-context" aria-live="polite">
            <span aria-hidden="true" className="header-status-dot" />
            <span>{activePage}</span>
          </div>
          <div className="header-account">
            <span aria-hidden="true" className="header-avatar">{initials}</span>
            <span className="header-account-copy">
              <strong>{user.name || "Account"}</strong>
              <small>{user.role}</small>
            </span>
          </div>
          <button className="sign-out-button" onClick={out} type="button">Sign out <span aria-hidden="true">↗</span></button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}