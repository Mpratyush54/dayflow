import { Link } from 'react-router-dom';
import './Landing.css';

const features = [
  {
    icon: '◧',
    title: 'Employee profiles',
    desc: 'Single source of truth for every teammate — role, team, contact, and employment history in one quiet card.',
    tint: 'mint',
  },
  {
    icon: '◐',
    title: 'Attendance that respects time',
    desc: 'One-tap check-in/out, weekly hours chart, and a heatmap of your month — no spreadsheets.',
    tint: 'lavender',
  },
  {
    icon: '✦',
    title: 'Leave, without the chase',
    desc: 'Apply in seconds, track balances live, and let managers approve from anywhere.',
    tint: 'peach',
  },
  {
    icon: '⬡',
    title: 'Payroll, made transparent',
    desc: 'Net pay breakdowns, revision trails, and payslips that actually make sense.',
    tint: 'sky',
  },
  {
    icon: '⬔',
    title: 'Role-based access',
    desc: 'Employees see their world. HR/Admins see everyone. Nothing more, nothing less.',
    tint: 'mint',
  },
  {
    icon: '⬢',
    title: 'Secure by default',
    desc: 'JWT auth, one-time passwords, and email verification — so access stays intentional.',
    tint: 'lavender',
  },
];

const steps = [
  { n: '01', title: 'HR creates your account', desc: 'No self sign-up spam. HR generates your employee ID + one-time password.' },
  { n: '02', title: 'You sign in & verify', desc: 'Email verification, then set your own password. You’re in — in under a minute.' },
  { n: '03', title: 'Everything flows from there', desc: 'Check in, request leave, view payslips. HR manages approvals & payroll in the same space.' },
];

export default function Landing() {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand">DayFlow</Link>
          <div className="landing-nav__links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#roles">Roles</a>
          </div>
          <Link to="/signin" className="btn btn--primary landing-nav__cta">Sign in</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="orb landing-hero__orb" aria-hidden />
        <div className="orb landing-hero__orb2" aria-hidden />
        <div className="landing-hero__inner">
          <div className="landing-hero__copy animate-in">
            <span className="badge">HRMS · Built for calm operations</span>
            <h1 className="landing-hero__title">
              People operations,<br />
              finally in <span className="text-gradient">flow.</span>
            </h1>
            <p className="landing-hero__sub">
              DayFlow is the quiet HRMS for modern teams — attendance, leave, and payroll
              in one editorial workspace. No clutter. No neon. Just work that moves.
            </p>
            <div className="landing-hero__actions">
              <Link to="/signin" className="btn btn--primary landing-hero__btn">Sign in to DayFlow</Link>
              <a href="#features" className="btn btn--outline landing-hero__btn">Explore features</a>
            </div>
            <p className="landing-hero__hint">Accounts are created by HR — ask your HR officer for access.</p>
          </div>

          <div className="landing-hero__visual animate-in" style={{ animationDelay: '0.12s' }}>
            <div className="landing-preview">
              <div className="landing-preview__bar">
                <span className="landing-preview__dot" />
                <span className="landing-preview__dot" />
                <span className="landing-preview__dot" />
                <span className="landing-preview__title">DayFlow · Dashboard</span>
              </div>
              <div className="landing-preview__grid">
                <div className="landing-preview__card landing-preview__card--wide">
                  <span className="landing-preview__label">Hours this week</span>
                  <div className="landing-preview__bars">
                    <span style={{ height: 28 }} /><span style={{ height: 42 }} /><span style={{ height: 20 }} /><span style={{ height: 48 }} /><span style={{ height: 12 }} />
                  </div>
                  <span className="landing-preview__meta">28h logged · ↑ 17% vs last week</span>
                </div>
                <div className="landing-preview__card landing-preview__card--tint-mint">
                  <span className="landing-preview__big">92%</span>
                  <span className="landing-preview__meta">Attendance · August</span>
                  <div className="landing-preview__ring" aria-hidden />
                </div>
                <div className="landing-preview__card landing-preview__card--tint-peach">
                  <span className="landing-preview__label">Leave balance</span>
                  <div className="landing-preview__track"><div style={{ width: '66%' }} /></div>
                  <div className="landing-preview__track"><div style={{ width: '80%' }} /></div>
                  <div className="landing-preview__track"><div style={{ width: '100%' }} /></div>
                </div>
                <div className="landing-preview__card landing-preview__card--dark">
                  <span className="landing-preview__big" style={{ color: 'var(--color-on-dark)' }}>₹61.3k</span>
                  <span className="landing-preview__meta" style={{ color: 'var(--color-on-dark-soft)' }}>Net pay · August · 10 days to payday</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS / TRUST */}
      <section className="landing-trust">
        <p className="landing-trust__label">Trusted by teams who value clarity</p>
        <div className="landing-trust__row">
          <span>Atlas &amp; Co.</span>
          <span>Mono Studio</span>
          <span>North Forms</span>
          <span>Walden Works</span>
          <span>Field Labs</span>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="landing-section">
        <div className="landing-section__head animate-in">
          <span className="badge">Features</span>
          <h2>Everything HR needs.<br />Nothing it doesn&apos;t.</h2>
          <p>Designed as a magazine, built as a system — DayFlow keeps the surface calm and the data precise.</p>
        </div>
        <div className="landing-features">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`card card--tint-${f.tint} landing-feature animate-in`}
              style={{ animationDelay: `${0.06 * i}s` }}
            >
              <span className="landing-feature__icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="landing-how">
        <div className="landing-how__inner">
          <div className="landing-how__head">
            <span className="badge">How it works</span>
            <h2>Three steps to flow</h2>
          </div>
          <div className="landing-steps">
            {steps.map((s, i) => (
              <div key={s.n} className="landing-step animate-in" style={{ animationDelay: `${0.08 * i}s` }}>
                <span className="landing-step__num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="landing-section">
        <div className="landing-roles">
          <div className="card landing-role animate-in">
            <span className="badge">For employees</span>
            <h3>Your work, clearly</h3>
            <p>Profile, attendance, leaves, and payslip — one dashboard, no guesswork.</p>
            <ul>
              <li>Check in / out with live timestamps</li>
              <li>Apply &amp; track leave with balances</li>
              <li>View salary breakdown transparently</li>
            </ul>
            <Link to="/signin" className="btn btn--outline" style={{ marginTop: 'var(--space-lg)' }}>Sign in as employee</Link>
          </div>
          <div className="card card--dark landing-role animate-in" style={{ animationDelay: '0.1s' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--color-on-dark)' }}>For HR &amp; Admin</span>
            <h3 style={{ color: 'var(--color-on-dark)' }}>The control room</h3>
            <p style={{ color: 'var(--color-on-dark-soft)' }}>Manage people, approve leave, review attendance, and publish payroll — all revision-tracked.</p>
            <ul style={{ color: 'var(--color-on-dark-soft)' }}>
              <li>Create &amp; manage employees</li>
              <li>Approve / reject leave requests</li>
              <li>Edit payroll structure with audit trail</li>
            </ul>
            <Link to="/signin" className="btn btn--primary" style={{ marginTop: 'var(--space-lg)', background: 'var(--color-on-dark)', color: 'var(--color-surface-dark)' }}>Sign in as HR</Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="landing-stats">
        <div className="landing-stats__item">
          <span className="landing-stats__num">~40%</span>
          <span className="landing-stats__label">less time on HR admin</span>
        </div>
        <div className="landing-stats__divider" />
        <div className="landing-stats__item">
          <span className="landing-stats__num">1-tap</span>
          <span className="landing-stats__label">check-in &amp; leave requests</span>
        </div>
        <div className="landing-stats__divider" />
        <div className="landing-stats__item">
          <span className="landing-stats__num">100%</span>
          <span className="landing-stats__label">payroll transparency</span>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-cta">
        <div className="landing-cta__card card--dark">
          <div className="orb landing-cta__orb" aria-hidden />
          <div>
            <h2 style={{ color: 'var(--color-on-dark)' }}>Start your day in flow</h2>
            <p style={{ color: 'var(--color-on-dark-soft)' }}>Sign in to DayFlow or ask HR to create your account. Quiet, precise, and ready.</p>
          </div>
          <div className="landing-cta__actions">
            <Link to="/signin" className="btn btn--primary" style={{ background: 'var(--color-on-dark)', color: 'var(--color-surface-dark)' }}>Sign in</Link>
            <a href="#features" className="btn btn--outline" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'var(--color-on-dark)' }}>Learn more</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div>
            <span className="landing-footer__brand">DayFlow</span>
            <p>Human Resource Management System — attendance, leave, payroll, and the calm between.</p>
          </div>
          <div className="landing-footer__cols">
            <div>
              <span className="landing-footer__head">Product</span>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#roles">Roles</a>
            </div>
            <div>
              <span className="landing-footer__head">Access</span>
              <Link to="/signin">Sign in</Link>
              <a href="#roles">HR / Admin</a>
              <a href="#roles">Employee</a>
            </div>
            <div>
              <span className="landing-footer__head">System</span>
              <span>JWT · Email verify</span>
              <span>Role-based access</span>
              <span>Revision-tracked payroll</span>
            </div>
          </div>
        </div>
        <div className="landing-footer__bottom">
          <span>© 2026 DayFlow HRMS — built for the Hackathon.</span>
          <span>Off-white canvas · Ink pill · Pastel orbs.</span>
        </div>
      </footer>
    </div>
  );
}
