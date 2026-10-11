import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Cannot reach the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <header className="login-brand">
        <div className="login-brand-icon" aria-hidden="true">+</div>
        <div>
          <strong>MediFlow</strong>
          <span>HOSPITAL MANAGEMENT</span>
        </div>
      </header>

      <main className="login-content">
        <section className="login-card" aria-labelledby="login-heading">
          <div className="login-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="login-eyebrow">WELCOME BACK</p>
          <h1 id="login-heading">Sign in to your account</h1>
          <p className="login-subtitle">Access your hospital workspace securely.</p>

          <form className="login-form" onSubmit={submit}>
            <label htmlFor="login-email">Email address</label>
            <input
              autoComplete="username"
              autoFocus
              id="login-email"
              type="email"
              placeholder="you@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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

            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? <><span className="login-spinner" /> Signing in…</> : <>Sign in <span aria-hidden="true">→</span></>}
            </button>
          </form>

          <div className="login-security">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2.5 3.5 5v4.3c0 4.1 2.8 6.9 6.5 8.2 3.7-1.3 6.5-4.1 6.5-8.2V5L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="m7.5 10 1.7 1.7 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Your connection and patient data are protected
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <span>© 2026 MediFlow Health</span>
        <span>Care made coordinated.</span>
      </footer>
    </div>
  );
}