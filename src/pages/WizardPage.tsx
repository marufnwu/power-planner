import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Zap, Home, Sun, Building2 } from 'lucide-react';
import { createDefaultProject, encodeProject } from '../lib/state';
import { applianceTemplates } from '../data/catalogs';

type WizardStep = 'shedding' | 'loads' | 'goal' | 'solar' | 'roof' | 'budget' | 'result';

interface WizardAnswers {
  outagesPerDay: number;
  outageDuration: number;
  heavierAtNight: boolean;
  selectedLoads: string[];
  goal: 'basic' | 'most';
  autonomyHours: number;
  solarInterest: 'none' | 'later' | 'now_backup' | 'now_bill';
  roofSpace: 'none' | 'limited' | 'ample' | 'shaded';
  budgetBand: 'low' | 'mid' | 'high';
}

export function WizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('shedding');
  const [answers, setAnswers] = useState<WizardAnswers>({
    outagesPerDay: 4,
    outageDuration: 90,
    heavierAtNight: true,
    selectedLoads: ['ceiling-fan', 'led-bulb', 'wifi-router'],
    goal: 'basic',
    autonomyHours: 4,
    solarInterest: 'none',
    roofSpace: 'none',
    budgetBand: 'mid',
  });

  const steps: WizardStep[] = ['shedding', 'loads', 'goal', 'solar', 'roof', 'budget', 'result'];
  const currentIdx = steps.indexOf(step);

  const next = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };
  const prev = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const goToPlanner = () => {
    const project = createDefaultProject();
    // Apply wizard answers to project
    project.grid.outageMinutes = answers.outageDuration;
    project.grid.gridMinutes = Math.max(60, (1440 / answers.outagesPerDay) - answers.outageDuration);
    
    // Set loads based on selection
    const loads = answers.selectedLoads.map((templateId, idx) => {
      const tmpl = applianceTemplates.find(t => t.id === templateId);
      if (!tmpl) return null;
      return {
        id: `load-${idx}`,
        templateId: tmpl.id,
        label: tmpl.name,
        qty: templateId === 'ceiling-fan' ? 3 : templateId === 'led-bulb' ? 3 : 1,
        watts: tmpl.watts,
        powerFactor: tmpl.powerFactor,
        surgeMultiplier: tmpl.surgeMultiplier,
        dutyCycle: tmpl.dutyCycle,
        hourly: new Array(24).fill(0.5),
        onBackupCircuit: true,
        priority: 2 as const,
      };
    }).filter(Boolean);
    project.loads = loads as typeof project.loads;

    // Add solar if interested
    if (answers.solarInterest === 'now_backup' || answers.solarInterest === 'now_bill') {
      project.pv = {
        panel: {
          id: 'mono-550wp', wp: 550, voc: 49.5, vmp: 41.0, isc: 13.5, imp: 13.0,
          tempCoeffVocPctPerC: -0.28, tempCoeffPmaxPctPerC: -0.35,
          price: 12000, verified: false, updatedAt: '2024-01-01',
        },
        series: 2,
        parallelStrings: 1,
      };
    }

    // Adjust battery based on autonomy need
    const totalW = project.loads.reduce((s, l) => s + l.qty * l.watts, 0);
    const neededWh = totalW * answers.autonomyHours / 0.88;
    if (neededWh > 1280) {
      // Need bigger battery
      project.bank.unit = { ...project.bank.unit, ratedAh: 200, id: 'lifepo4-12v-200ah' };
    } else if (neededWh > 800) {
      project.bank.unit = { ...project.bank.unit, ratedAh: 150, id: 'lifepo4-12v-150ah' };
    }

    const encoded = encodeProject(project);
    navigate(`/plan?s=${encoded}&v=1`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-bold text-lg">Help me choose</h1>
          <div className="text-sm text-gray-500">Step {currentIdx + 1}/{steps.length}</div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <div className="h-1 bg-gray-200 rounded-full">
            <div className="h-1 bg-amber-500 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {step === 'shedding' && (
          <StepCard title="How often is the power cut?" subtitle="Load-shedding pattern in your area">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Outages per day (approximate)</label>
                <input
                  type="range" min={1} max={10} value={answers.outagesPerDay}
                  onChange={e => setAnswers({ ...answers, outagesPerDay: +e.target.value })}
                  className="w-full"
                />
                <div className="text-center text-2xl font-bold text-amber-600">{answers.outagesPerDay} times/day</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Typical outage duration (minutes)</label>
                <input
                  type="range" min={15} max={300} step={15} value={answers.outageDuration}
                  onChange={e => setAnswers({ ...answers, outageDuration: +e.target.value })}
                  className="w-full"
                />
                <div className="text-center text-2xl font-bold text-amber-600">{answers.outageDuration} min</div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox" checked={answers.heavierAtNight}
                  onChange={e => setAnswers({ ...answers, heavierAtNight: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-amber-500"
                />
                <span>Outages are heavier/longer at night</span>
              </label>
            </div>
          </StepCard>
        )}

        {step === 'loads' && (
          <StepCard title="What must keep running?" subtitle="Select the appliances you need on backup">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {applianceTemplates.filter(t => t.inverterFriendly !== 'avoid').map(tmpl => (
                <label
                  key={tmpl.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers.selectedLoads.includes(tmpl.id) ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={answers.selectedLoads.includes(tmpl.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setAnswers({ ...answers, selectedLoads: [...answers.selectedLoads, tmpl.id] });
                      } else {
                        setAnswers({ ...answers, selectedLoads: answers.selectedLoads.filter(id => id !== tmpl.id) });
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500"
                  />
                  <div>
                    <div className="font-medium text-sm">{tmpl.name}</div>
                    <div className="text-xs text-gray-500">{tmpl.watts}W</div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              ⚠️ Appliances marked "avoid" (AC, heater, iron, geyser) should not be on a small IPS backup circuit.
            </p>
          </StepCard>
        )}

        {step === 'goal' && (
          <StepCard title="What's your goal?" subtitle="How much backup do you need?">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAnswers({ ...answers, goal: 'basic' })}
                  className={`p-4 rounded-lg border text-left transition-colors ${answers.goal === 'basic' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                >
                  <Home className="w-6 h-6 mb-2 text-amber-500" />
                  <div className="font-semibold">Basic comfort</div>
                  <div className="text-xs text-gray-500">Fans, lights, router</div>
                </button>
                <button
                  onClick={() => setAnswers({ ...answers, goal: 'most' })}
                  className={`p-4 rounded-lg border text-left transition-colors ${answers.goal === 'most' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                >
                  <Building2 className="w-6 h-6 mb-2 text-blue-500" />
                  <div className="font-semibold">Most of the home</div>
                  <div className="text-xs text-gray-500">TV, fridge, multiple rooms</div>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Desired backup hours</label>
                <input
                  type="range" min={1} max={12} value={answers.autonomyHours}
                  onChange={e => setAnswers({ ...answers, autonomyHours: +e.target.value })}
                  className="w-full"
                />
                <div className="text-center text-2xl font-bold text-amber-600">{answers.autonomyHours} hours</div>
              </div>
            </div>
          </StepCard>
        )}

        {step === 'solar' && (
          <StepCard title="Solar interest?" subtitle="Do you want to add solar panels?">
            <div className="space-y-3">
              {[
                { value: 'none', label: 'Not interested', desc: 'IPS/battery only' },
                { value: 'later', label: 'Maybe later', desc: 'Get a hybrid-ready inverter' },
                { value: 'now_backup', label: 'Yes, for backup', desc: 'Panels to recharge battery' },
                { value: 'now_bill', label: 'Yes, to cut the bill', desc: 'Panels for daytime savings' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers({ ...answers, solarInterest: opt.value as WizardAnswers['solarInterest'] })}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers.solarInterest === opt.value ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === 'roof' && (
          <StepCard title="Roof/terrace space?" subtitle="Solar panels need unshaded roof space">
            <div className="space-y-3">
              {[
                { value: 'none', label: 'No roof access', desc: 'Apartment, no terrace' },
                { value: 'limited', label: 'Limited space', desc: 'Some shade, small area' },
                { value: 'ample', label: 'Ample space', desc: 'Open terrace, good sun' },
                { value: 'shaded', label: 'Mostly shaded', desc: 'Trees or buildings block sun' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers({ ...answers, roofSpace: opt.value as WizardAnswers['roofSpace'] })}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers.roofSpace === opt.value ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === 'budget' && (
          <StepCard title="Budget range?" subtitle="Approximate total budget (editable later)">
            <div className="space-y-3">
              {[
                { value: 'low', label: 'Under ৳30,000', desc: 'Basic IPS + battery' },
                { value: 'mid', label: '৳30,000 – ৳80,000', desc: 'Hybrid inverter + LiFePO4' },
                { value: 'high', label: 'Above ৳80,000', desc: 'Full hybrid solar system' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers({ ...answers, budgetBand: opt.value as WizardAnswers['budgetBand'] })}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers.budgetBand === opt.value ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === 'result' && (
          <StepCard title="Your recommendation" subtitle="Based on your answers">
            <RecommendationCard answers={answers} />
            <div className="mt-6">
              <button
                onClick={goToPlanner}
                className="w-full py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
              >
                Size this system →
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will open the planner pre-filled with your selections. You can adjust everything there.
              </p>
            </div>
          </StepCard>
        )}

        {/* Navigation */}
        {step !== 'result' && (
          <div className="flex justify-between mt-6">
            <button
              onClick={prev}
              disabled={currentIdx === 0}
              className="px-4 py-2 text-gray-600 disabled:opacity-30 hover:text-gray-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={next}
              className="px-6 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 flex items-center gap-1"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
      {children}
    </div>
  );
}

function RecommendationCard({ answers }: { answers: WizardAnswers }) {
  const hasSolar = answers.solarInterest === 'now_backup' || answers.solarInterest === 'now_bill';
  const hasRoof = answers.roofSpace === 'ample' || answers.roofSpace === 'limited';
  
  let systemType: string;
  let reasons: string[];
  let cautions: string[];

  if (hasSolar && hasRoof) {
    systemType = 'C. Hybrid solar + battery, panels now';
    reasons = [
      `You have ${answers.autonomyHours}h backup need with ${answers.outagesPerDay} outages/day`,
      'You want solar panels and have roof space',
      'Solar will recharge the battery and reduce your electricity bill',
    ];
    cautions = [
      'Higher upfront cost than IPS-only',
      'Panel placement and shading matter — verify with a site survey',
    ];
  } else if (hasSolar && !hasRoof) {
    systemType = 'B. Hybrid inverter + battery, panels later';
    reasons = [
      'A hybrid inverter lets you add panels later when roof is available',
      `You need ${answers.autonomyHours}h backup for ${answers.outagesPerDay} daily outages`,
    ];
    cautions = [
      'Check the inverter\'s max PV input for future panel sizing',
      'Without panels now, the battery recharges only from the grid',
    ];
  } else {
    systemType = 'A. Basic IPS (inverter + battery, grid-charged)';
    reasons = [
      'Simple, cost-effective backup solution',
      `Handles ${answers.outagesPerDay} daily outages of ~${answers.outageDuration} min each`,
      'No roof needed',
    ];
    cautions = [
      'Does not reduce your electricity bill',
      'Battery recharge depends on grid availability between outages',
    ];
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-amber-600" />
          <span className="font-bold text-amber-800">{systemType}</span>
        </div>
        <div className="text-sm text-amber-700">
          <p className="font-semibold mb-1">Why this fits:</p>
          <ul className="list-disc list-inside space-y-1">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      </div>
      
      {cautions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="font-semibold text-yellow-800 text-sm mb-1">Watch out:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
            {cautions.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">Selected loads ({answers.selectedLoads.length}):</p>
        <p>{answers.selectedLoads.join(', ')}</p>
        <p className="mt-2">Target autonomy: <strong>{answers.autonomyHours} hours</strong></p>
      </div>
    </div>
  );
}
