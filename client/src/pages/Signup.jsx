import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import AuthLayout from "../AuthLayout";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <AuthLayout>
        <section className="login-card signup-card auth-card" aria-labelledby="signup-heading">
          <div className="login-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="login-eyebrow">PATIENT SIGN UP</p>
          <h1 id="signup-heading">Create your account</h1>
          <p className="login-subtitle">Set up your secure space for appointments and care.</p>

          {error && <p className="login-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}

          <form className="login-form signup-form" onSubmit={submit}>
            <div className="signup-fields-row">
              <div className="signup-field">
                <label htmlFor="signup-name">Full name</label>
                <input
                  autoComplete="name"
                  id="signup-name"
                  name="name"
                  onChange={updateField}
                  placeholder="e.g. Nimal Perera"
                  required
                  value={details.name}
                />
              </div>
              <div className="signup-field">
                <label htmlFor="signup-email">Email address</label>
                <input
                  autoComplete="email"
                  id="signup-email"
                  name="email"
                  onChange={updateField}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={details.email}
                />
              </div>
            </div>

            <div className="signup-fields-row">
              <div className="signup-field">
                <label htmlFor="signup-age">Age</label>
                <input
                  id="signup-age"
                  max="120"
                  min="1"
                  name="age"
                  onChange={updateField}
                  placeholder="Age"
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
              <div className="signup-field">
                <label htmlFor="signup-phone">Phone number</label>
                <input
                  autoComplete="tel"
                  id="signup-phone"
                  name="phone"
                  onChange={updateField}
                  placeholder="Your contact number"
                  required
                  type="tel"
                  value={details.phone}
                />
              </div>
            </div>

            <div className="signup-fields-row">
              <div className="signup-field">
                <label htmlFor="signup-password">Password</label>
                <div className="signup-password-field">
                  <input
                    autoComplete="new-password"
                    id="signup-password"
                    minLength="8"
                    name="password"
                    onChange={updateField}
                    placeholder="At least 8 characters"
                    required
                    type={showPassword ? "text" : "password"}
                    value={details.password}
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
              </div>
              <div className="signup-field">
                <label htmlFor="signup-confirm-password">Confirm password</label>
                <div className="signup-password-field">
                  <input
                    autoComplete="new-password"
                    id="signup-confirm-password"
                    minLength="8"
                    name="confirmPassword"
                    onChange={updateField}
                    placeholder="Enter it again"
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={details.confirmPassword}
                  />
                  <button
                    aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    type="button"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
            <p className="signup-password-hint">Use at least 8 characters. Choose a password you haven’t used elsewhere.</p>

            <button className="login-submit" disabled={loading} type="submit">
              {loading ? <><span className="login-spinner" /> Creating account…</> : <>Create account <span aria-hidden="true">→</span></>}
            </button>
          </form>

          <div className="auth-signup-prompt">
            <span>Already have an account?</span>
            <Link to="/patient/login">Sign in <span aria-hidden="true">→</span></Link>
          </div>
        </section>
    </AuthLayout>
  );
}
