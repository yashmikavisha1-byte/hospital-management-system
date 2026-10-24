import { Link } from "react-router-dom";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div aria-hidden="true" className="auth-glow auth-glow-one" />
      <div aria-hidden="true" className="auth-glow auth-glow-two" />

      <header className="auth-header">
        <Link aria-label="MediFlow home" className="auth-brand" to="/patient/login">
          <span aria-hidden="true" className="login-brand-icon">+</span>
          <span>
            <strong>MediFlow</strong>
            <small>HOSPITAL MANAGEMENT</small>
          </span>
        </Link>
        <span className="auth-header-note">
          <span aria-hidden="true" className="auth-status-dot" />
          A calmer way to manage care
        </span>
      </header>

      <main className="auth-main">
        <section aria-labelledby="auth-story-heading" className="auth-story">
          <div className="auth-story-kicker">
            <span aria-hidden="true">✦</span>
            Care, connected
          </div>
          <h1 id="auth-story-heading">Your health journey, all in one place.</h1>
          <p className="auth-story-copy">
            Stay close to your care team and keep the details of every visit organized.
          </p>

          <div className="auth-feature-list">
            <article className="auth-feature">
              <span aria-hidden="true" className="auth-feature-icon">◷</span>
              <span>
                <strong>Appointments made simple</strong>
                <small>Find and manage upcoming visits.</small>
              </span>
              <span aria-hidden="true" className="auth-feature-arrow">↗</span>
            </article>
            <article className="auth-feature">
              <span aria-hidden="true" className="auth-feature-icon">▤</span>
              <span>
                <strong>Your care, clearly organized</strong>
                <small>Keep records and updates together.</small>
              </span>
              <span aria-hidden="true" className="auth-feature-arrow">↗</span>
            </article>
            <article className="auth-feature">
              <span aria-hidden="true" className="auth-feature-icon">✓</span>
              <span>
                <strong>Private and protected</strong>
                <small>Your account is for you alone.</small>
              </span>
              <span aria-hidden="true" className="auth-feature-arrow">↗</span>
            </article>
          </div>

          <div className="auth-story-note">
            <span aria-hidden="true" className="auth-note-mark">+</span>
            <span><strong>Care that feels more connected.</strong><small>Welcome to your MediFlow workspace.</small></span>
          </div>
        </section>

        <div className="auth-form-side">{children}</div>
      </main>

      <footer className="auth-footer">
        <span>© 2026 MediFlow Health</span>
        <span>Designed for better coordinated care</span>
      </footer>
    </div>
  );
}
