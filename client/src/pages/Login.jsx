import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import AuthLayout from "../AuthLayout";

const ROLES = {
  admin: { label: "Admin", subtitle: "Manage the hospital, staff and system settings." },
  doctor: { label: "Doctor", subtitle: "Access your patients, schedule and records." },
  patient: { label: "Patient", subtitle: "View your appointments and health records." },
};

export default function Login({ role = "patient" }) {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const info = ROLES[role] || ROLES.patient;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      const user = result?.user || result;

      // block users who log in on the wrong role page
      if (user?.role && user.role !== role) {
        if (logout) logout();
        setError(`This account is not a ${info.label}. Please use the correct login page.`);
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Cannot reach the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
        <section className="login-card auth-card" aria-labelledby="login-heading">
          <div className="login-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="login-eyebrow">{info.label.toUpperCase()} WORKSPACE</p>
          <h1 id="login-heading">Sign in as {info.label}</h1>
          <p className="login-subtitle">{info.subtitle}</p>

          {error && <p className="login-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}

          <form className="login-form" onSubmit={submit}>
            <label htmlFor="login-email">Email address <span>Use the email linked to your account</span></label>
            <input
              autoComplete="username"
              id="login-email"
              type="email"
              placeholder="you@hospital.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />

            <div className="login-password-heading">
              <label htmlFor="login-password">Password</label>
            </div>
            <div className="login-password-field">
              <input
                autoComplete="current-password"
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? <><span className="login-spinner" /> Signing in…</> : <>Sign in <span aria-hidden="true">→</span></>}
            </button>
          </form>

          <nav aria-label="Choose account type" className="login-role-switch">
            <span className="role-switch-label">Sign in as</span>
            {Object.entries(ROLES).map(([key, r]) => (
              <Link
                aria-current={key === role ? "page" : undefined}
                className={key === role ? "role-link role-link-active" : "role-link"}
                key={key}
                to={`/${key}/login`}
              >
                {r.label}
              </Link>
            ))}
          </nav>
          {role === "patient" && (
            <div className="auth-signup-prompt">
              <span>New to MediFlow?</span>
              <Link to="/patient/signup">Create a patient account <span aria-hidden="true">→</span></Link>
            </div>
          )}

          <div className="login-security">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2.5 3.5 5v4.3c0 4.1 2.8 6.9 6.5 8.2 3.7-1.3 6.5-4.1 6.5-8.2V5L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="m7.5 10 1.7 1.7 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span><strong>Secure sign in</strong><small>Your account and care details stay private.</small></span>
          </div>
        </section>
    </AuthLayout>
  );
}