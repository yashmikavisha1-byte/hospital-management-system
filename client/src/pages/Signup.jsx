import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setDetails((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (details.password !== details.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const registration = { ...details, age: Number(details.age) };
      delete registration.confirmPassword;
      await register(registration);
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
        <section className="login-card signup-card" aria-labelledby="signup-heading">
          <div className="login-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="login-eyebrow">PATIENT SIGN UP</p>
          <h1 id="signup-heading">Create your account</h1>
          <p className="login-subtitle">Sign up to manage your care and appointments.</p>

          {error && <p className="login-error" role="alert">{error}</p>}

          <form className="login-form signup-form" onSubmit={submit}>
            <label htmlFor="signup-name">Full name</label>
            <input
              autoComplete="name"
              id="signup-name"
              name="name"
              onChange={updateField}
              required
              value={details.name}
            />

            <label htmlFor="signup-email">Email address</label>
            <input
              autoComplete="email"
              id="signup-email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={details.email}
            />

            <div className="signup-fields-row">
              <div className="signup-field">
                <label htmlFor="signup-age">Age</label>
                <input
                  id="signup-age"
                  max="120"
                  min="1"
                  name="age"
                  onChange={updateField}
                  required
                  type="number"
                  value={details.age}
                />
              </div>
              <div className="signup-field">
                <label htmlFor="signup-gender">Gender</label>
                <select
                  id="signup-gender"
                  name="gender"
                  onChange={updateField}
                  required
                  value={details.gender}
                >
                  <option disabled value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            <label htmlFor="signup-phone">Phone number</label>
            <input
              autoComplete="tel"
              id="signup-phone"
              name="phone"
              onChange={updateField}
              required
              type="tel"
              value={details.phone}
            />

            <label htmlFor="signup-password">Password</label>
            <input
              autoComplete="new-password"
              id="signup-password"
              minLength="8"
              name="password"
              onChange={updateField}
              required
              type="password"
              value={details.password}
            />

            <label htmlFor="signup-confirm-password">Confirm password</label>
            <input
              autoComplete="new-password"
              id="signup-confirm-password"
              minLength="8"
              name="confirmPassword"
              onChange={updateField}
              required
              type="password"
              value={details.confirmPassword}
            />

            <button className="login-submit" disabled={loading} type="submit">
              {loading ? <><span className="login-spinner" /> Creating account…</> : <>Create account <span aria-hidden="true">→</span></>}
            </button>
          </form>

          <p className="login-role-switch">
            Already have an account? <Link to="/patient/login">Sign in</Link>
          </p>
        </section>
      </main>

      <footer className="login-footer">
        <span>© 2026 MediFlow Health</span>
        <span>Care made coordinated.</span>
      </footer>
    </div>
  );
}
