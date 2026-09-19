import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { I18nProvider, LocaleToggle } from './lib/i18n';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const WizardPage = lazy(() => import('./pages/WizardPage').then(m => ({ default: m.WizardPage })));
const PlannerPage = lazy(() => import('./pages/PlannerPage').then(m => ({ default: m.PlannerPage })));
const AssumptionsPage = lazy(() => import('./pages/AssumptionsPage').then(m => ({ default: m.AssumptionsPage })));
const LearnPage = lazy(() => import('./pages/LearnPage').then(m => ({ default: m.LearnPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then(m => ({ default: m.AuditPage })));

function Layout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isHome = location.pathname === '/';

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh', color: 'var(--ink)' }}>
      {/* Navigation */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled || !isHome ? 'rgba(250, 250, 247, 0.85)' : 'transparent',
          backdropFilter: scrolled || !isHome ? 'blur(12px)' : 'none',
          borderBottom: scrolled || !isHome ? '1px solid var(--border)' : '1px solid transparent',
        }}
      >
        <nav className="container-ultra flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--ink)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--paper)', fontFamily: 'var(--font-mono)' }}>⚡</span>
            </div>
            <span className="font-medium text-sm tracking-tight">Power Planner</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <NavLink to="/choose" label="Choose" />
            <NavLink to="/plan" label="Planner" />
            <NavLink to="/audit" label="Audit" />
            <NavLink to="/learn" label="Learn" />
            <NavLink to="/assumptions" label="Assumptions" />
          </div>
          <div className="flex items-center gap-3">
            <LocaleToggle />
            <Link to="/plan" className="btn-primary text-xs md:text-sm py-2 px-4">
              Open planner
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/choose" element={<WizardPage />} />
            <Route path="/plan" element={<PlannerPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/assumptions" element={<AssumptionsPage />} />
            <Route path="/learn" element={<LearnPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="mt-24 py-12 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-ultra">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="display-md mb-3" style={{ maxWidth: '20ch' }}>
                Size it right. <em>Understand why.</em>
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)', maxWidth: '40ch' }}>
                A free planning tool for home IPS, inverter-battery, and hybrid solar systems. No login. No accounts. All calculations run in your browser.
              </p>
            </div>
            <div>
              <div className="eyebrow mb-3">Tool</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/choose" style={{ color: 'var(--ink)' }}>Help me choose</Link></li>
                <li><Link to="/plan" style={{ color: 'var(--ink)' }}>Planner</Link></li>
                <li><Link to="/learn" style={{ color: 'var(--ink)' }}>Learning hub</Link></li>
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-3">Reference</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/assumptions" style={{ color: 'var(--ink)' }}>All assumptions</Link></li>
                <li><a href="https://github.com" style={{ color: 'var(--ink)' }}>Source code</a></li>
              </ul>
            </div>
          </div>
          <div className="divider mb-6" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs" style={{ color: 'var(--muted)' }}>
            <p>Results are planning estimates, not engineered designs. Confirm with a licensed electrician.</p>
            <p style={{ fontFamily: 'var(--font-mono)' }}>v1.0 · built with care</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className="relative transition-colors"
      style={{ color: active ? 'var(--ink)' : 'var(--muted)' }}
    >
      {label}
      {active && (
        <span
          className="absolute -bottom-1 left-0 right-0 h-px"
          style={{ background: 'var(--ink)' }}
        />
      )}
    </Link>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <div className="text-center">
        <div className="num text-sm mb-2" style={{ color: 'var(--muted)' }}>Loading</div>
        <div className="w-24 h-px mx-auto overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full w-1/3 animate-pulse" style={{ background: 'var(--ink)' }} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </I18nProvider>
  );
}
