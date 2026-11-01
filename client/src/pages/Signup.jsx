import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import AuthLayout from "../AuthLayout";

const PROFILE_FIELDS = ["name", "email", "age", "gender", "phone"];
const ALL_FIELDS = [...PROFILE_FIELDS, "password", "confirmPassword"];

function validateField(field, details) {
  const value = details[field];
  if (field === "name" && !value.trim()) return "Enter your full name.";
  if (field === "email") {
    if (!value.trim()) return "Enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address.";
  }
  if (field === "age") {
    const age = Number(value);
    if (!value) return "Enter your age.";
    if (!Number.isInteger(age) || age < 1 || age > 120) return "Age must be between 1 and 120.";
  }
  if (field === "gender" && !value) return "Choose an option.";
  if (field === "phone" && !value.trim()) return "Enter your phone number.";
  if (field === "password") {
    if (!value) return "Create a password.";
    if (value.length < 8) return "Use at least 8 characters.";
  }
  if (field === "confirmPassword") {
    if (!value) return "Enter your password again.";
    if (value !== details.password) return "Passwords do not match.";
  }
  return "";
}

function FieldError({ id, message }) {
  return message ? <small className="signup-field-error" id={id} role="alert">{message}</small> : null;
}

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
  const [touched, setTouched] = useState({});
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fieldError = (field) => touched[field] ? validateField(field, details) : "";

  const updateField = (event) => {
    const { name, value } = event.target;
    setDetails((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const touchFields = (fields) => {
    setTouched((current) => ({
      ...current,
      ...Object.fromEntries(fields.map((field) => [field, true])),
    }));
  };

  const continueToPassword = () => {
    touchFields(PROFILE_FIELDS);
    const invalid = PROFILE_FIELDS.find((field) => validateField(field, details));
    if (invalid) {
      document.getElementById(`signup-${invalid}`)?.focus();
      return;
    }
    setError("");
    setStep(2);
  };

  const passwordStrength = (() => {
    const password = details.password;
    if (!password) return { score: 0, label: "Not set" };
    const score = [
      password.length >= 8,
      password.length >= 12,
      /[a-z]/.test(password) && /[A-Z]/.test(password),
      /\d/.test(password),
      /[^a-zA-Z0-9]/.test(password),
    ].filter(Boolean).length;
    return {
      score,
      label: score <= 2 ? "Needs work" : score <= 3 ? "Getting stronger" : "Strong password",
    };
  })();

  const submit = async (event) => {
    event.preventDefault();
    if (step === 1) {
      continueToPassword();
      return;
    }

    setError("");
    touchFields(ALL_FIELDS);
    const invalid = ALL_FIELDS.find((field) => validateField(field, details));
    if (invalid) {
      document.getElementById(`signup-${invalid}`)?.focus();
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

  const inputProps = (field) => {
    const message = fieldError(field);
    return {
      "aria-describedby": message ? `signup-${field}-error` : undefined,
      "aria-invalid": message ? "true" : undefined,
      name: field,
      onBlur: () => touchFields([field]),
      onChange: updateField,
      value: details[field],
    };
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
        <h1 id="signup-heading">{step === 1 ? "Create your account" : "Choose a password"}</h1>
        <p className="login-subtitle">
          {step === 1
            ? "First, tell us a little about yourself."
            : "Choose a password to keep your account secure."}
        </p>

        <ol aria-label="Sign-up progress" className="signup-progress">
          <li aria-current={step === 1 ? "step" : undefined} className={step >= 1 ? "signup-progress-active" : ""}>
            <span>1</span><span>Your details</span>
          </li>
          <li aria-hidden="true" className="signup-progress-line" />
          <li aria-current={step === 2 ? "step" : undefined} className={step >= 2 ? "signup-progress-active" : ""}>
            <span>2</span><span>Secure account</span>
          </li>
        </ol>

        {error && <p className="login-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}

        <form className="login-form signup-form" noValidate onSubmit={submit}>
          {step === 1 ? (
            <>
              <div className="signup-fields-row">
                <div className="signup-field">
                  <label htmlFor="signup-name">Full name</label>
                  <input
                    {...inputProps("name")}
                    autoComplete="name"
                    id="signup-name"
                    placeholder="e.g. Nimal Perera"
                    type="text"
                  />
                  <FieldError id="signup-name-error" message={fieldError("name")} />
                </div>
                <div className="signup-field">
                  <label htmlFor="signup-email">Email address</label>
                  <input
                    {...inputProps("email")}
                    autoComplete="email"
                    id="signup-email"
                    placeholder="you@example.com"
                    type="email"
                  />
                  <FieldError id="signup-email-error" message={fieldError("email")} />
                </div>
              </div>

              <div className="signup-fields-row">
                <div className="signup-field">
                  <label htmlFor="signup-age">Age</label>
                  <input
                    {...inputProps("age")}
                    id="signup-age"
                    max="120"
                    min="1"
                    placeholder="Your age"
                    type="number"
                  />
                  <FieldError id="signup-age-error" message={fieldError("age")} />
                </div>
                <div className="signup-field">
                  <label htmlFor="signup-gender">Gender</label>
                  <select {...inputProps("gender")} id="signup-gender">
                    <option value="">Select</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                  <FieldError id="signup-gender-error" message={fieldError("gender")} />
                </div>
              </div>

              <div className="signup-field">
                <label htmlFor="signup-phone">Phone number</label>
                <input
                  {...inputProps("phone")}
                  autoComplete="tel"
                  id="signup-phone"
                  placeholder="Your contact number"
                  type="tel"
                />
                <FieldError id="signup-phone-error" message={fieldError("phone")} />
              </div>

              <aside className="signup-privacy-note">
                <span aria-hidden="true">i</span>
                <p><strong>Why we ask</strong>Your details create your patient profile and help the care team manage your visits.</p>
              </aside>

              <button className="login-submit" type="submit">
                Continue <span aria-hidden="true">→</span>
              </button>
            </>
          ) : (
            <>
              <div className="signup-field">
                <label htmlFor="signup-password">Password</label>
                <div className="signup-password-field">
                  <input
                    {...inputProps("password")}
                    autoComplete="new-password"
                    id="signup-password"
                    placeholder="At least 8 characters"
                    type={showPassword ? "text" : "password"}
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
                <FieldError id="signup-password-error" message={fieldError("password")} />
              </div>

              <div aria-label={`Password strength: ${passwordStrength.label}`} className="signup-strength">
                <div aria-hidden="true" className="signup-strength-bars">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <span className={bar <= passwordStrength.score ? `strength-filled strength-level-${passwordStrength.score}` : ""} key={bar} />
                  ))}
                </div>
                <span>{passwordStrength.label}</span>
              </div>
              <p className="signup-password-hint">Use 8 or more characters. A mix of uppercase letters, numbers, and symbols makes it stronger.</p>

              <div className="signup-field signup-confirm-field">
                <label htmlFor="signup-confirm-password">Confirm password</label>
                <div className="signup-password-field">
                  <input
                    {...inputProps("confirmPassword")}
                    autoComplete="new-password"
                    id="signup-confirm-password"
                    placeholder="Enter your password again"
                    type={showConfirmPassword ? "text" : "password"}
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
                <FieldError id="signup-confirmPassword-error" message={fieldError("confirmPassword")} />
              </div>

              <div className="signup-step-actions">
                <button className="signup-back-button" onClick={() => setStep(1)} type="button">
                  <span aria-hidden="true">←</span> Back
                </button>
                <button className="login-submit" disabled={loading} type="submit">
                  {loading ? <><span className="login-spinner" /> Creating account…</> : <>Create account <span aria-hidden="true">→</span></>}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="auth-signup-prompt">
          <span>Already have an account?</span>
          <Link to="/patient/login">Sign in <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </AuthLayout>
  );
}
