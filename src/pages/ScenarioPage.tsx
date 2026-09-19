import { useParams, Link } from 'react-router-dom';
import { generateScenarios, generateFAQ, generateStructuredData } from '../lib/seoScenarios';
import { createDefaultProject, encodeProject } from '../lib/state';
import { batteryCatalog } from '../data/catalogs';
import { ArrowLeft, Zap, Battery, Sun, Calculator } from 'lucide-react';
import { useEffect } from 'react';

export function ScenarioPage() {
  const { slug } = useParams<{ slug: string }>();
  const scenarios = generateScenarios();
  const scenario = scenarios.find(s => s.slug === slug);

  useEffect(() => {
    if (scenario) {
      // Add structured data to page
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(generateStructuredData(scenario));
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [scenario]);

  if (!scenario) {
    return (
      <div className="pt-24 pb-16">
        <div className="container-narrow">
          <div className="text-center py-16">
            <h1 className="display-lg mb-4">Scenario not found</h1>
            <p className="text-base mb-8" style={{ color: 'var(--muted)' }}>
              The configuration you're looking for doesn't exist.
            </p>
            <Link to="/" className="btn-primary">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const faqs = generateFAQ(scenario);
  const battery = batteryCatalog.find(b => 
    b.chemistry === scenario.batteryChemistry && b.ratedAh === scenario.batteryAh
  ) || batteryCatalog[0];

  // Create pre-filled project
  const project = createDefaultProject();
  project.inverter = {
    ...project.inverter,
    ratedVA: scenario.inverterVA,
    ratedW: scenario.inverterVA * 0.8,
  };
  project.bank = {
    unit: battery,
    series: 1,
    parallel: 1,
  };
  project.loads = scenario.loads.map((load, i) => ({
    id: `load-${i}`,
    label: load.name,
    qty: load.qty,
    watts: load.watts,
    powerFactor: 0.9,
    surgeMultiplier: 1,
    dutyCycle: 1,
    hourly: new Array(24).fill(0.5),
    onBackupCircuit: true,
    priority: 2 as const,
    usageProfile: 'both' as const,
  }));

  if (scenario.solarWp) {
    project.pv = {
      panel: {
        id: 'mono-550wp',
        wp: 550,
        voc: 49.5,
        vmp: 41.0,
        isc: 13.5,
        imp: 13.0,
        tempCoeffVocPctPerC: -0.28,
        tempCoeffPmaxPctPerC: -0.35,
        price: 12000,
        verified: false,
        updatedAt: '2024-01-01',
      },
      series: Math.ceil(scenario.solarWp / 550),
      parallelStrings: 1,
    };
  }

  const plannerUrl = `/plan?s=${encodeProject(project)}&v=1`;

  return (
    <div className="pt-24 pb-16">
      <div className="container-narrow">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2" style={{ color: 'var(--muted)' }}>
            <li><Link to="/" className="hover:underline">Home</Link></li>
            <li>/</li>
            <li><Link to="/learn" className="hover:underline">Scenarios</Link></li>
            <li>/</li>
            <li style={{ color: 'var(--ink)' }}>{scenario.title.split(' ').slice(0, 3).join(' ')}...</li>
          </ol>
        </nav>

        {/* Hero */}
        <header className="mb-12">
          <div className="eyebrow mb-3">Configuration Guide</div>
          <h1 className="display-lg mb-4">{scenario.title}</h1>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            {scenario.description}
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Zap className="w-5 h-5 mb-2" style={{ color: 'var(--accent)' }} />
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Inverter</div>
            <div className="text-xl font-bold num">{scenario.inverterVA}VA</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Battery className="w-5 h-5 mb-2" style={{ color: 'var(--success)' }} />
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Battery</div>
            <div className="text-xl font-bold num">{scenario.batteryAh}Ah {scenario.batteryChemistry.toUpperCase()}</div>
          </div>
          {scenario.solarWp && (
            <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Sun className="w-5 h-5 mb-2" style={{ color: '#f59e0b' }} />
              <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Solar</div>
              <div className="text-xl font-bold num">{scenario.solarWp}Wp</div>
            </div>
          )}
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Calculator className="w-5 h-5 mb-2" style={{ color: 'var(--info)' }} />
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Loads</div>
            <div className="text-xl font-bold num">{scenario.loads.reduce((sum, l) => sum + l.qty, 0)} items</div>
          </div>
        </div>

        {/* Load Details */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Load Configuration</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--paper-warm)' }}>
                  <th className="text-left py-3 px-4 font-medium text-sm">Appliance</th>
                  <th className="text-center py-3 px-4 font-medium text-sm">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Watts</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Total</th>
                </tr>
              </thead>
              <tbody>
                {scenario.loads.map((load, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-3 px-4">{load.name}</td>
                    <td className="py-3 px-4 text-center num">{load.qty}</td>
                    <td className="py-3 px-4 text-right num">{load.watts}W</td>
                    <td className="py-3 px-4 text-right num font-medium">{load.qty * load.watts}W</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--paper-warm)' }}>
                  <td className="py-3 px-4 font-bold" colSpan={3}>Total Connected Load</td>
                  <td className="py-3 px-4 text-right num font-bold">
                    {scenario.loads.reduce((sum, l) => sum + l.qty * l.watts, 0)}W
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <div className="p-8 rounded-2xl text-center" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
            <h2 className="text-2xl font-bold mb-3">Ready to size this system?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Open the planner with this configuration pre-filled. Adjust any parameter to see how it affects performance.
            </p>
            <Link to={plannerUrl} className="btn-primary">
              Open in planner →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <summary className="p-4 cursor-pointer font-medium hover:bg-[var(--paper-warm)] transition-colors">
                  {faq.question}
                </summary>
                <div className="p-4 pt-0" style={{ color: 'var(--muted)' }}>
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Related Scenarios */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Related Configurations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios
              .filter(s => s.slug !== scenario.slug)
              .slice(0, 4)
              .map(related => (
                <Link
                  key={related.slug}
                  to={`/scenarios/${related.slug}`}
                  className="p-4 rounded-xl hover:shadow-md transition-shadow"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  <div className="font-medium mb-1">{related.title.split(' ').slice(0, 5).join(' ')}...</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {related.inverterVA}VA · {related.batteryAh}Ah {related.batteryChemistry}
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
