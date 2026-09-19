import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDefaultProject, encodeProject } from '../lib/state';
import { applianceTemplates } from '../data/catalogs';
import { generateHourlyProfile } from '../lib/usageProfiles';
import { ChevronRight } from 'lucide-react';

type WizardStep = 'shedding' | 'loads' | 'goal' | 'solar' | 'roof' | 'result';

interface WizardAnswers {
  outagesPerDay: number;
  outageDuration: number;
  heavierAtNight: boolean;
  selectedLoads: string[];
  goal: 'basic' | 'most';
  autonomyHours: number;
  solarInterest: 'none' | 'later' | 'now_backup' | 'now_bill';
  roofSpace: 'none' | 'limited' | 'ample' | 'shaded';
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
  });

  const steps: WizardStep[] = ['shedding', 'loads', 'goal', 'solar', 'roof', 'result'];
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
    project.grid.outageMinutes = answers.outageDuration;
    project.grid.gridMinutes = Math.max(60, (1440 / answers.outagesPerDay) - answers.outageDuration);
    
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
        hourly: generateHourlyProfile(tmpl.defaultUsage, tmpl.category),
        onBackupCircuit: true,
        priority: 2 as const,
        usageProfile: tmpl.defaultUsage,
      };
    }).filter(Boolean);
    project.loads = loads as typeof project.loads;

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

    const totalW = project.loads.reduce((s, l) => s + l.qty * l.watts, 0);
    const neededWh = totalW * answers.autonomyHours / 0.88;
    if (neededWh > 1280) {
      project.bank.unit = { ...project.bank.unit, ratedAh: 200, id: 'lifepo4-12v-200ah' };
    } else if (neededWh > 800) {
      project.bank.unit = { ...project.bank.unit, ratedAh: 150, id: 'lifepo4-12v-150ah' };
    }

    const encoded = encodeProject(project);
    navigate(`/plan?s=${encoded}&v=1`);
  };

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="container-narrow">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="eyebrow">
              Step <span className="num">{currentIdx + 1}</span> of {steps.length - 1}
            </div>
            <div className="num text-xs" style={{ color: 'var(--muted)' }}>
              {Math.round((currentIdx / (steps.length - 1)) * 100)}%
            </div>
          </div>
          <div className="h-px w-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%`, background: 'var(--ink)' }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="animate-fade-up" key={step}>
          {step === 'shedding' && (
            <StepLayout
              eyebrow="Load shedding"
              title="How often is the power cut?"
              subtitle="We'll use this to size your battery and check if it can recharge between outages."
            >
              <div className="space-y-8">
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <label className="text-sm font-medium">Outages per day</label>
                    <div className="display-md num">{answers.outagesPerDay}</div>
                  </div>
                  <input
                    type="range" min={1} max={10} value={answers.outagesPerDay}
                    onChange={e => setAnswers({ ...answers, outagesPerDay: +e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <label className="text-sm font-medium">Typical outage duration</label>
                    <div className="display-md num">
                      {answers.outageDuration}
                      <span className="text-lg ml-1" style={{ color: 'var(--muted)' }}>min</span>
                    </div>
                  </div>
                  <input
                    type="range" min={15} max={300} step={15} value={answers.outageDuration}
                    onChange={e => setAnswers({ ...answers, outageDuration: +e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl" style={{ background: 'var(--paper-warm)' }}>
                  <input
                    type="checkbox" checked={answers.heavierAtNight}
                    onChange={e => setAnswers({ ...answers, heavierAtNight: e.target.checked })}
                  />
                  <span className="text-sm">Outages are heavier or longer at night</span>
                </label>
              </div>
            </StepLayout>
          )}

          {step === 'loads' && (
            <StepLayout
              eyebrow="Your loads"
              title="What must keep running?"
              subtitle="Select the appliances you need on backup. You can adjust quantities later."
            >
              <div className="grid grid-cols-2 gap-2">
                {applianceTemplates.filter(t => t.inverterFriendly !== 'avoid').map(tmpl => {
                  const selected = answers.selectedLoads.includes(tmpl.id);
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        if (selected) {
                          setAnswers({ ...answers, selectedLoads: answers.selectedLoads.filter(id => id !== tmpl.id) });
                        } else {
                          setAnswers({ ...answers, selectedLoads: [...answers.selectedLoads, tmpl.id] });
                        }
                      }}
                      className="p-4 text-left rounded-xl transition-all"
                      style={{
                        background: selected ? 'var(--ink)' : 'var(--surface)',
                        color: selected ? 'var(--paper)' : 'var(--ink)',
                        border: selected ? '1px solid var(--ink)' : '1px solid var(--border)',
                      }}
                    >
                      <div className="text-sm font-medium">{tmpl.name}</div>
                      <div className="text-xs mt-1 num opacity-60">
                        {tmpl.watts}W · {tmpl.category}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>
                ⚠️ Appliances marked "avoid" (AC, heater, iron, geyser) should not be on a small IPS backup circuit.
              </p>
            </StepLayout>
          )}

          {step === 'goal' && (
            <StepLayout
              eyebrow="Your goal"
              title="How much backup do you need?"
              subtitle="This determines battery size."
            >
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAnswers({ ...answers, goal: 'basic' })}
                    className="p-6 text-left rounded-2xl transition-all"
                    style={{
                      background: answers.goal === 'basic' ? 'var(--ink)' : 'var(--surface)',
                      color: answers.goal === 'basic' ? 'var(--paper)' : 'var(--ink)',
                      border: answers.goal === 'basic' ? '1px solid var(--ink)' : '1px solid var(--border)',
                    }}
                  >
                    <div className="text-3xl mb-2">◐</div>
                    <div className="font-medium">Basic comfort</div>
                    <div className="text-xs mt-1 opacity-60">Fans, lights, router</div>
                  </button>
                  <button
                    onClick={() => setAnswers({ ...answers, goal: 'most' })}
                    className="p-6 text-left rounded-2xl transition-all"
                    style={{
                      background: answers.goal === 'most' ? 'var(--ink)' : 'var(--surface)',
                      color: answers.goal === 'most' ? 'var(--paper)' : 'var(--ink)',
                      border: answers.goal === 'most' ? '1px solid var(--ink)' : '1px solid var(--border)',
                    }}
                  >
                    <div className="text-3xl mb-2">◉</div>
                    <div className="font-medium">Most of the home</div>
                    <div className="text-xs mt-1 opacity-60">TV, fridge, multiple rooms</div>
                  </button>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <label className="text-sm font-medium">Desired backup hours</label>
                    <div className="display-md num">
                      {answers.autonomyHours}
                      <span className="text-lg ml-1" style={{ color: 'var(--muted)' }}>h</span>
                    </div>
                  </div>
                  <input
                    type="range" min={1} max={12} value={answers.autonomyHours}
                    onChange={e => setAnswers({ ...answers, autonomyHours: +e.target.value })}
                  />
                </div>
              </div>
            </StepLayout>
          )}

          {step === 'solar' && (
            <StepLayout
              eyebrow="Solar"
              title="Interested in solar panels?"
              subtitle="Solar can recharge your battery between outages and reduce your bill."
            >
              <div className="space-y-2">
                {[
                  { value: 'none', label: 'Not interested', desc: 'IPS/battery only' },
                  { value: 'later', label: 'Maybe later', desc: 'Get a hybrid-ready inverter' },
                  { value: 'now_backup', label: 'Yes, for backup', desc: 'Panels recharge battery' },
                  { value: 'now_bill', label: 'Yes, to cut the bill', desc: 'Panels for daytime savings' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAnswers({ ...answers, solarInterest: opt.value as any })}
                    className="w-full p-5 text-left rounded-xl transition-all flex items-center justify-between group"
                    style={{
                      background: answers.solarInterest === opt.value ? 'var(--ink)' : 'var(--surface)',
                      color: answers.solarInterest === opt.value ? 'var(--paper)' : 'var(--ink)',
                      border: answers.solarInterest === opt.value ? '1px solid var(--ink)' : '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs mt-0.5 opacity-60">{opt.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </StepLayout>
          )}

          {step === 'roof' && (
            <StepLayout
              eyebrow="Roof space"
              title="Do you have roof or terrace access?"
              subtitle="Solar panels need unshaded space. About 7 m² per kWp."
            >
              <div className="space-y-2">
                {[
                  { value: 'none', label: 'No roof access', desc: 'Apartment, no terrace' },
                  { value: 'limited', label: 'Limited space', desc: 'Some shade, small area' },
                  { value: 'ample', label: 'Ample space', desc: 'Open terrace, good sun' },
                  { value: 'shaded', label: 'Mostly shaded', desc: 'Trees or buildings block sun' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAnswers({ ...answers, roofSpace: opt.value as any })}
                    className="w-full p-5 text-left rounded-xl transition-all flex items-center justify-between group"
                    style={{
                      background: answers.roofSpace === opt.value ? 'var(--ink)' : 'var(--surface)',
                      color: answers.roofSpace === opt.value ? 'var(--paper)' : 'var(--ink)',
                      border: answers.roofSpace === opt.value ? '1px solid var(--ink)' : '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs mt-0.5 opacity-60">{opt.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </StepLayout>
          )}

          {step === 'result' && (
            <ResultStep answers={answers} onContinue={goToPlanner} />
          )}
        </div>

        {/* Navigation */}
        {step !== 'result' && (
          <div className="flex justify-between mt-12 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={prev}
              disabled={currentIdx === 0}
              className="btn-ghost disabled:opacity-30"
            >
              ← Back
            </button>
            <button onClick={next} className="btn-primary">
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepLayout({ eyebrow, title, subtitle, children }: {
  eyebrow: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h1 className="display-lg mb-3">{title}</h1>
      <p className="text-base mb-10" style={{ color: 'var(--muted)', maxWidth: '52ch' }}>{subtitle}</p>
      {children}
    </div>
  );
}

function ResultStep({ answers, onContinue }: { answers: WizardAnswers; onContinue: () => void }) {
  const hasSolar = answers.solarInterest === 'now_backup' || answers.solarInterest === 'now_bill';
  const hasRoof = answers.roofSpace === 'ample' || answers.roofSpace === 'limited';
  
  let systemType: string;
  let reasons: string[];
  let cautions: string[];

  if (hasSolar && hasRoof) {
    systemType = 'Hybrid solar + battery';
    reasons = [
      `${answers.autonomyHours}h backup need with ${answers.outagesPerDay} outages/day`,
      'You want solar and have roof space',
      'Solar recharges battery and reduces bill',
    ];
    cautions = [
      'Higher upfront cost than IPS-only',
      'Verify panel placement with a site survey',
    ];
  } else if (hasSolar && !hasRoof) {
    systemType = 'Hybrid inverter, panels later';
    reasons = [
      'Hybrid inverter lets you add panels later',
      `${answers.autonomyHours}h backup for ${answers.outagesPerDay} daily outages`,
    ];
    cautions = [
      'Check inverter\'s max PV input for future sizing',
      'Battery recharges only from grid until panels added',
    ];
  } else {
    systemType = 'Basic IPS (inverter + battery)';
    reasons = [
      'Simple, cost-effective backup',
      `Handles ${answers.outagesPerDay} daily outages of ~${answers.outageDuration} min`,
      'No roof needed',
    ];
    cautions = [
      'Does not reduce electricity bill',
      'Recharge depends on grid availability',
    ];
  }

  return (
    <div>
      <div className="eyebrow mb-3">Recommendation</div>
      <h1 className="display-lg mb-8">
        You need a <em style={{ color: 'var(--accent)' }}>{systemType}</em> system.
      </h1>

      <div className="space-y-6 mb-10">
        <div className="p-6 rounded-2xl" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-3" style={{ color: 'var(--success)' }}>Why this fits</div>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {cautions.length > 0 && (
          <div className="p-6 rounded-2xl" style={{ background: 'var(--warning-soft)', border: '1px solid #fde68a' }}>
            <div className="eyebrow mb-3" style={{ color: 'var(--warning)' }}>Watch out</div>
            <ul className="space-y-2">
              {cautions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span style={{ color: 'var(--warning)' }}>!</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-3">Your selections</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div style={{ color: 'var(--muted)' }} className="text-xs mb-1">Loads</div>
              <div className="num font-medium">{answers.selectedLoads.length} items</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }} className="text-xs mb-1">Autonomy</div>
              <div className="num font-medium">{answers.autonomyHours}h</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }} className="text-xs mb-1">Outages</div>
              <div className="num font-medium">{answers.outagesPerDay}/day · {answers.outageDuration}min</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }} className="text-xs mb-1">Solar</div>
              <div className="num font-medium">{answers.solarInterest === 'none' ? 'No' : answers.solarInterest === 'later' ? 'Later' : 'Yes'}</div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onContinue} className="btn-primary w-full justify-center py-4 text-base">
        Size this system →
      </button>
      <p className="text-xs text-center mt-3" style={{ color: 'var(--muted)' }}>
        Opens the planner pre-filled with your selections. Adjust everything there.
      </p>
    </div>
  );
}
