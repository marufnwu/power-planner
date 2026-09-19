import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

export function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        
        <div className="container-ultra relative w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <div className="eyebrow mb-6 animate-fade-up">
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)' }} />
                  Free · No login · Runs in your browser
                </span>
              </div>
              
              <h1 className="display-xl mb-8 animate-fade-up stagger-1">
                Size your <em style={{ color: 'var(--accent)' }}>IPS</em> or solar system.
                <br />
                <span style={{ color: 'var(--muted)' }}>See the math behind every number.</span>
              </h1>
              
              <p className="text-lg mb-10 animate-fade-up stagger-2" style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                Plan your home inverter-battery or hybrid solar setup. Understand why it works — or doesn't. Avoid the expensive mistakes installers won't tell you about.
              </p>
              
              <div className="flex flex-wrap gap-3 animate-fade-up stagger-3">
                <Link to="/choose" className="btn-primary">
                  Help me choose
                  <span>→</span>
                </Link>
                <Link to="/plan" className="btn-secondary">
                  Open planner
                </Link>
              </div>
            </div>
            
            {/* Side panel — live preview */}
            <div className="lg:col-span-4 animate-fade-up stagger-4">
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto section */}
      <section className="py-24 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-wide">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4">
              <div className="eyebrow mb-4">How this is different</div>
              <h2 className="display-md">
                No scores. <em>No "best choice" badges.</em> Just numbers.
              </h2>
            </div>
            <div className="md:col-span-7 md:col-start-6 space-y-8 pt-4">
              <Principle
                num="01"
                title="Show the math"
                body="Every number has a 'Show the math' view — inputs, formula, result, assumptions. You can verify it yourself."
              />
              <Principle
                num="02"
                title="Honest defaults"
                body="All equipment specs are editable defaults marked 'check your datasheet'. Nothing is invented or presented as fact."
              />
              <Principle
                num="03"
                title="Honest uncertainty"
                body="We show min / expected / max ranges, not falsely precise single numbers. Real systems have variance."
              />
              <Principle
                num="04"
                title="Safety first"
                body="Battery banks can deliver hundreds of amps in a short circuit. Warnings are part of the product, not an afterthought."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Entry paths */}
      <section className="py-24 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-wide">
          <div className="eyebrow mb-4">Where to start</div>
          <h2 className="display-md mb-16">Four ways in. <em>Pick the one that fits.</em></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: 'var(--border)' }}>
            <EntryPath
              num="A"
              title="Help me choose"
              body="Not sure what you need? Answer a few questions, get a recommendation with reasons."
              link="/choose"
              cta="Start wizard"
              accent
            />
            <EntryPath
              num="B"
              title="Plan a system"
              body="Full planner with loads, battery comparison, solar sizing, and cost analysis."
              link="/plan"
              cta="Open planner"
            />
            <EntryPath
              num="C"
              title="Audit my setup"
              body="Already have an IPS? Enter your gear and see real runtime, weak points, upgrade options."
              link="/plan"
              cta="Start audit"
            />
            <EntryPath
              num="D"
              title="Learn the basics"
              body="Articles on IPS vs hybrid, battery chemistry, sizing, and the mistakes we see installers make."
              link="/learn"
              cta="Read articles"
            />
          </div>
        </div>
      </section>

      {/* Stats / credibility */}
      <section className="py-24 border-t" style={{ borderColor: 'var(--border)', background: 'var(--ink)', color: 'var(--paper)' }}>
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat num="17" label="Appliance templates" sub="editable defaults" />
            <Stat num="4" label="Battery chemistries" sub="side-by-side comparison" />
            <Stat num="20+" label="Safety checks" sub="warn before you buy" />
            <Stat num="0" label="Logins required" sub="ever" />
          </div>
        </div>
      </section>

      {/* Safety notice */}
      <section className="py-16 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-narrow">
          <div className="eyebrow mb-4" style={{ color: 'var(--danger)' }}>Safety notice</div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--ink)' }}>
            Results are <strong>estimates for planning</strong>, not an engineered design. Battery banks can deliver very high current — use correct cable sizes, DC-rated fuses, and proper terminals. Lead-acid and tubular batteries need ventilation. LiFePO4 needs a suitable BMS. Never mix old and new batteries, different capacities, or different chemistries in one bank.
          </p>
          <p className="text-base leading-relaxed mt-4" style={{ color: 'var(--muted)' }}>
            For life-critical medical equipment, consult the device manufacturer and plan redundancy. Confirm with a licensed electrician before buying or installing.
          </p>
        </div>
      </section>
    </div>
  );
}

function HeroPreview() {
  const [value, setValue] = useState(0);
  const target = 3.8;
  
  useEffect(() => {
    const start = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    const t = setTimeout(() => requestAnimationFrame(tick), 400);
    return () => clearTimeout(t);
  }, []);
  
  return (
    <div className="relative p-8 rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="eyebrow mb-4">Example result</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="num text-6xl md:text-7xl font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
          {value.toFixed(1)}
        </span>
        <span className="text-xl" style={{ color: 'var(--muted)' }}>hours</span>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        1.2kVA inverter · 100Ah LiFePO4 · 240W load
      </p>
      <div className="divider mb-4" />
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
        <span>Recovers between outages</span>
        <span className="badge badge-success">✓</span>
      </div>
    </div>
  );
}

function Principle({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-6">
      <div className="num text-sm pt-1" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{num}</div>
      <div>
        <h3 className="text-xl font-medium mb-2 tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
      </div>
    </div>
  );
}

function EntryPath({ num, title, body, link, cta, accent }: {
  num: string; title: string; body: string; link: string; cta: string; accent?: boolean;
}) {
  return (
    <Link
      to={link}
      className="group block p-10 transition-colors"
      style={{ background: accent ? 'var(--paper-warm)' : 'var(--paper)' }}
    >
      <div className="flex items-start justify-between mb-8">
        <div className="num text-sm" style={{ color: accent ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          {num}
        </div>
        <span
          className="text-xl transition-transform group-hover:translate-x-1"
          style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}
        >
          →
        </span>
      </div>
      <h3 className="display-md mb-3 tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)', maxWidth: '40ch' }}>
        {body}
      </p>
      <div className="text-sm font-medium" style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>
        {cta} →
      </div>
    </Link>
  );
}

function Stat({ num, label, sub }: { num: string; label: string; sub: string }) {
  return (
    <div>
      <div className="display-lg mb-2 num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--paper)' }}>
        {num}
      </div>
      <div className="text-sm font-medium mb-1" style={{ color: 'var(--paper)' }}>{label}</div>
      <div className="text-xs" style={{ color: 'var(--faint)' }}>{sub}</div>
    </div>
  );
}
