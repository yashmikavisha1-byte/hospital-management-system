import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  const menu = MENUS[user.role] || MENUS.patient;

  const out = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app">
      <aside aria-label="Main navigation" className="sidebar">
        <h3><span aria-hidden="true">✚</span> MediFlow</h3>
        <p className="workspace-label">HOSPITAL WORKSPACE</p>
        {menu.map(([label, path]) => (
          <NavLink key={path} to={path} end={path === "/"}>
            {label}
          </NavLink>
        ))}
        <div className="sidebar-account">
          <span className="account-avatar">{user.name?.trim()?.charAt(0)?.toUpperCase() || "U"}</span>
          <span className="account-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
        </div>
      </aside>
      <div className="main">
        <header>
          <div className="header-context">
            <span className="header-status-dot" />
            <span>Care operations</span>
          </div>
          <button aria-label="Sign out" onClick={out} type="button">Sign out <span aria-hidden="true">↗</span></button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}