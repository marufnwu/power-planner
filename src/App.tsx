import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { I18nProvider, LocaleToggle } from './lib/i18n';
import { ThemeToggle } from './components/ThemeToggle';
import { ToastProvider } from './components/Toast';
import { Zap, Menu, X } from 'lucide-react';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const WizardPage = lazy(() => import('./pages/WizardPage').then(m => ({ default: m.WizardPage })));
const PlannerPage = lazy(() => import('./pages/PlannerPage').then(m => ({ default: m.PlannerPage })));
const AssumptionsPage = lazy(() => import('./pages/AssumptionsPage').then(m => ({ default: m.AssumptionsPage })));
const LearnPage = lazy(() => import('./pages/LearnPage').then(m => ({ default: m.LearnPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then(m => ({ default: m.AuditPage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then(m => ({ default: m.ComparePage })));
const ScenarioPage = lazy(() => import('./pages/ScenarioPage').then(m => ({ default: m.ScenarioPage })));
const BusinessModePage = lazy(() => import('./pages/BusinessModePage').then(m => ({ default: m.BusinessModePage })));

function Layout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileMenuOpen(false); // Close mobile menu on route change
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isHome = location.pathname === '/';

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh', color: 'var(--ink)' }}>
      {/* Skip to main content link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
        style={{ 
          background: 'var(--ink)', 
          color: 'var(--paper)' 
        }}
      >
        Skip to main content
      </a>
      
      {/* Navigation */}
      <header
        role="banner"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || !isHome ? 'header-solid' : 'header-transparent'
        }`}
      >
        <nav aria-label="Main navigation" className="container-ultra flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'var(--ink)' }}>
              <Zap className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--paper)' }} />
            </div>
            <span className="font-semibold text-sm md:text-base tracking-tight hidden sm:inline">Power Planner</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            <NavLink to="/choose" label="Choose" />
            <NavLink to="/plan" label="Planner" />
            <NavLink to="/audit" label="Audit" />
            <NavLink to="/business" label="Business" />
            <NavLink to="/compare" label="Compare" />
            <NavLink to="/learn" label="Learn" />
            <NavLink to="/assumptions" label="Assumptions" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <LocaleToggle />
            <Link to="/plan" className="btn-primary text-sm py-2 px-4 hidden md:inline-flex">
              Open planner
            </Link>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
              style={{ 
                background: mobileMenuOpen ? 'var(--ink)' : 'transparent',
                color: mobileMenuOpen ? 'var(--paper)' : 'var(--ink)'
              }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 top-14 z-40 animate-fade-in overflow-y-auto"
            style={{ background: 'var(--paper)' }}
          >
            <div className="container-ultra py-4 space-y-1">
              <MobileNavLink to="/choose" label="Help me choose" icon="🎯" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavLink to="/plan" label="Planner" icon="📊" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavLink to="/audit" label="Audit my system" icon="🔍" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavLink to="/business" label="Business mode" icon="🏢" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavLink to="/compare" label="Compare configurations" icon="⚖️" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavLink to="/learn" label="Learning hub" icon="📚" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavLink to="/assumptions" label="All assumptions" icon="📋" onClick={() => setMobileMenuOpen(false)} />
              
              <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <Link 
                  to="/plan" 
                  className="btn-primary w-full justify-center py-3 text-base"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Open planner
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main role="main" id="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/choose" element={<WizardPage />} />
            <Route path="/plan" element={<PlannerPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/business" element={<BusinessModePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/scenarios/:slug" element={<ScenarioPage />} />
            <Route path="/assumptions" element={<AssumptionsPage />} />
            <Route path="/learn" element={<LearnPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="mt-12 md:mt-24 py-8 md:py-12 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-ultra">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-12">
            <div className="md:col-span-2">
              <div className="display-md mb-2 md:mb-3" style={{ maxWidth: '20ch' }}>
                Size it right. <em>Understand why.</em>
              </div>
              <p className="text-xs md:text-sm leading-relaxed" style={{ color: 'var(--muted)', maxWidth: '40ch' }}>
                A free planning tool for home IPS, inverter-battery, and hybrid solar systems. No login. No accounts. All calculations run in your browser.
              </p>
            </div>
            <div>
              <div className="eyebrow mb-2 md:mb-3 text-xs">Tool</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/choose" style={{ color: 'var(--ink)' }} className="hover:underline">Help me choose</Link></li>
                <li><Link to="/plan" style={{ color: 'var(--ink)' }} className="hover:underline">Planner</Link></li>
                <li><Link to="/learn" style={{ color: 'var(--ink)' }} className="hover:underline">Learning hub</Link></li>
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-2 md:mb-3 text-xs">Reference</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/assumptions" style={{ color: 'var(--ink)' }} className="hover:underline">All assumptions</Link></li>
                <li><a href="https://github.com" style={{ color: 'var(--ink)' }} className="hover:underline">Source code</a></li>
              </ul>
            </div>
          </div>
          <div className="divider mb-4 md:mb-6" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 text-xs" style={{ color: 'var(--muted)' }}>
            <p className="leading-relaxed">Results are planning estimates, not engineered designs. Confirm with a licensed electrician.</p>
            <p className="flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>v1.0 · built with care</p>
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
      className="relative px-3 py-2 rounded-lg transition-all text-sm font-medium"
      style={{ 
        color: active ? 'var(--ink)' : 'var(--muted)',
        background: active ? 'var(--paper-warm)' : 'transparent'
      }}
    >
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      )}
    </Link>
  );
}

function MobileNavLink({ to, label, icon, onClick }: { to: string; label: string; icon: string; onClick: () => void }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-4 rounded-xl transition-all min-h-[56px]"
      style={{ 
        background: active ? 'var(--paper-warm)' : 'transparent',
        border: active ? '1px solid var(--border)' : '1px solid transparent'
      }}
    >
      <span className="text-3xl flex-shrink-0">{icon}</span>
      <span className="text-base font-medium flex-1" style={{ color: active ? 'var(--ink)' : 'var(--muted)' }}>
        {label}
      </span>
    </Link>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-16 md:pt-20">
      <div className="text-center px-4">
        <div className="num text-sm mb-3" style={{ color: 'var(--muted)' }}>Loading</div>
        <div className="w-32 h-0.5 mx-auto overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
          <div className="h-full w-1/3 animate-pulse rounded-full" style={{ background: 'var(--ink)' }} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <I18nProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </I18nProvider>
    </ToastProvider>
  );
}
