import { Link } from 'react-router-dom';
import { Zap, Sun, Calculator, Shield, BarChart3, BookOpen } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-lg">Home Power Planner</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/choose" className="text-gray-600 hover:text-gray-900">Help me choose</Link>
            <Link to="/plan" className="text-gray-600 hover:text-gray-900">Planner</Link>
            <Link to="/learn" className="text-gray-600 hover:text-gray-900">Learn</Link>
            <Link to="/assumptions" className="text-gray-600 hover:text-gray-900">Assumptions</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 via-white to-blue-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Size your IPS or solar system correctly
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Plan your home inverter-battery or hybrid solar system. Understand why, avoid expensive mistakes, and see the math behind every number.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/choose"
              className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
            >
              Help me choose →
            </Link>
            <Link
              to="/plan"
              className="px-6 py-3 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 hover:border-gray-400 transition-colors shadow-sm"
            >
              Open planner
            </Link>
          </div>
        </div>
      </section>

      {/* Entry Cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Where do you want to start?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EntryCard
            icon={<Calculator className="w-8 h-8 text-amber-500" />}
            title="Help me choose"
            description="Not sure what system you need? Answer a few questions and get a recommendation."
            link="/choose"
            linkText="Start wizard"
          />
          <EntryCard
            icon={<BarChart3 className="w-8 h-8 text-blue-500" />}
            title="Plan a system"
            description="Full planner with loads, battery comparison, solar sizing, and cost analysis."
            link="/plan"
            linkText="Open planner"
          />
          <EntryCard
            icon={<Sun className="w-8 h-8 text-green-500" />}
            title="Add solar"
            description="See how many panels you need, what they save, and how they help during outages."
            link="/plan"
            linkText="Plan solar"
          />
          <EntryCard
            icon={<BookOpen className="w-8 h-8 text-purple-500" />}
            title="Learn"
            description="Articles on IPS vs hybrid, battery chemistry, sizing, and common mistakes."
            link="/learn"
            linkText="Read articles"
          />
        </div>
      </section>

      {/* Trust & Principles */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">How this tool is different</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TrustItem
              icon={<Shield className="w-6 h-6 text-green-600" />}
              title="No arbitrary scores"
              description="We show numbers, assumptions, and trade-offs. No star ratings or 'best choice' badges."
            />
            <TrustItem
              icon={<Calculator className="w-6 h-6 text-blue-600" />}
              title="Show the math"
              description="Every number is explainable. Click 'Show the math' to see inputs, formula, and result."
            />
            <TrustItem
              icon={<Zap className="w-6 h-6 text-amber-600" />}
              title="Honest defaults"
              description="All equipment specs are editable defaults marked 'check your datasheet'. Nothing is invented."
            />
          </div>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="bg-red-50 border-t border-red-200 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Safety notice</h3>
              <p className="text-sm text-red-700">
                Results are estimates for planning, not an engineered design. Battery banks can deliver very high current — use correct cable sizes, DC-rated fuses, and proper terminals. Confirm with a licensed electrician before buying or installing. For life-critical medical equipment, consult the device manufacturer and plan redundancy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>Home Power Planner · Free, no login required · All calculations run in your browser</p>
          <p className="mt-2">
            <Link to="/assumptions" className="hover:text-white">View all assumptions</Link>
            {' · '}
            <Link to="/learn" className="hover:text-white">Learning hub</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function EntryCard({ icon, title, description, link, linkText }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <Link to={link} className="text-amber-600 font-semibold text-sm hover:text-amber-700">
        {linkText} →
      </Link>
    </div>
  );
}

function TrustItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
