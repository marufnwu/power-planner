import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { batteryCatalog, defaultInverter, defaultPvPanel, applianceTemplates } from '../data/catalogs';
import { BatteryUnit, Inverter, LoadItem } from '../types';
import { calculateContinuousRuntime, calculateSizing, runSimulation } from '../lib/engine/calculator';
import { generateHourlyProfile } from '../lib/usageProfiles';
import { createDefaultProject, encodeProject } from '../lib/state';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AlertTriangle, Check, ArrowRight, Zap, Battery as BatteryIcon, Sun, X } from 'lucide-react';

export function AuditPage() {
  const navigate = useNavigate();
  
  // Existing equipment
  const [inverterVA, setInverterVA] = useState(1200);
  const [inverterW, setInverterW] = useState(720);
  const [systemVoltage, setSystemVoltage] = useState<12 | 24 | 48>(12);
  const [batteryId, setBatteryId] = useState('lifepo4-12v-100ah');
  const [batteryCount, setBatteryCount] = useState(1);
  const [hasSolar, setHasSolar] = useState(false);
  const [solarWp, setSolarWp] = useState(0);
  const [batteryAgeYears, setBatteryAgeYears] = useState(0);
  
  // Current loads
  const [loads, setLoads] = useState<{ templateId: string; qty: number }[]>([
    { templateId: 'ceiling-fan', qty: 3 },
    { templateId: 'led-bulb', qty: 3 },
    { templateId: 'wifi-router', qty: 1 },
  ]);
  
  // Outage pattern
  const [outageMin, setOutageMin] = useState(90);
  const [gridMin, setGridMin] = useState(180);

  const battery = batteryCatalog.find(b => b.id === batteryId) || batteryCatalog[0];
  
  // Build a project for simulation
  const project = useMemo(() => {
    const p = createDefaultProject();
    p.inverter = { ...p.inverter, ratedVA: inverterVA, ratedW: inverterW, systemVoltage };
    p.bank = { unit: battery, series: Math.ceil(systemVoltage / battery.nominalV), parallel: batteryCount };
    p.grid = { ...p.grid, outageMinutes: outageMin, gridMinutes: gridMin };
    
    // Build loads
    p.loads = loads.map((l, i) => {
      const tmpl = applianceTemplates.find(t => t.id === l.templateId);
      if (!tmpl) return null;
      return {
        id: `audit-load-${i}`,
        templateId: tmpl.id,
        label: tmpl.name,
        qty: l.qty,
        watts: tmpl.watts,
        powerFactor: tmpl.powerFactor,
        surgeMultiplier: tmpl.surgeMultiplier,
        dutyCycle: tmpl.dutyCycle,
        hourly: generateHourlyProfile(tmpl.defaultUsage, tmpl.category),
        onBackupCircuit: true,
        priority: 2 as const,
        usageProfile: tmpl.defaultUsage,
      };
    }).filter(Boolean) as LoadItem[];
    
    if (hasSolar && solarWp > 0) {
      p.pv = {
        panel: { ...defaultPvPanel, wp: solarWp },
        series: 1,
        parallelStrings: 1,
      };
    }
    
    return p;
  }, [inverterVA, inverterW, systemVoltage, battery, batteryCount, outageMin, gridMin, loads, hasSolar, solarWp]);

  const result = useMemo(() => runSimulation(project), [project]);
  const sizing = useMemo(() => calculateSizing(project), [project]);

  // Calculate actual runtime
  const totalLoadW = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => {
    const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
    return s + l.qty * l.watts * l.dutyCycle * avgHourly;
  }, 0);
  
  // Capacity degradation from age
  const ageFactor = batteryAgeYears > 0 ? Math.max(0.5, 1 - batteryAgeYears * 0.05) : 1;
  const effectiveRuntime = result.continuousRuntime * ageFactor;

  // Issues detection
  const issues: { severity: 'critical' | 'warn' | 'ok'; message: string; fix: string }[] = [];
  
  if (totalLoadW > inverterW * 0.9) {
    issues.push({ severity: 'critical', message: 'Inverter overloaded', fix: `Your load (${totalLoadW.toFixed(0)}W) exceeds inverter capacity (${inverterW}W). Upgrade to ${Math.ceil(totalLoadW * 1.25 / 100) * 100}W inverter.` });
  }
  
  if (result.recoveryStatus === 'no') {
    issues.push({ severity: 'critical', message: 'Battery cannot recharge between outages', fix: `Recharge takes ${result.closedFormRecharge.toFixed(1)}h but only ${gridMin / 60}h grid time. Add solar or increase grid charge current.` });
  } else if (result.recoveryStatus === 'barely') {
    issues.push({ severity: 'warn', message: 'Battery barely recharges between outages', fix: 'Consider adding solar panels or reducing load.' });
  }
  
  if (result.minSoC < 20) {
    issues.push({ severity: 'critical', message: `Battery reaches ${result.minSoC.toFixed(0)}% SoC during outages`, fix: 'Increase battery capacity or reduce load.' });
  }
  
  if (batteryAgeYears > battery.calendarLifeYears.typ * 0.7) {
    issues.push({ severity: 'warn', message: `Battery is ${batteryAgeYears} years old (expected life: ${battery.calendarLifeYears.typ}y)`, fix: 'Plan for replacement soon. Capacity has degraded.' });
  }
  
  if (battery.chemistry === 'tubular' && result.avgDoD > 0.5) {
    issues.push({ severity: 'warn', message: `Daily DoD ${(result.avgDoD * 100).toFixed(0)}% exceeds 50% recommended for tubular`, fix: 'Add more battery capacity or reduce daily discharge.' });
  }
  
  if (result.unservedWh > 0) {
    issues.push({ severity: 'critical', message: `Load shedding: ${(result.unservedWh / 1000).toFixed(2)} kWh/day unserved`, fix: 'System cannot support your loads. Upgrade battery or inverter.' });
  }
  
  if (issues.length === 0) {
    issues.push({ severity: 'ok', message: 'System looks healthy', fix: 'No critical issues detected.' });
  }

  const upgradeToPlanner = () => {
    const encoded = encodeProject(project);
    navigate(`/plan?s=${encoded}&v=1`);
  };

  return (
    <div className="pt-24 pb-16">
      <div className="container-ultra">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="eyebrow mb-2">Audit</div>
              <h1 className="display-lg mb-2">What do you have?</h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Enter your existing equipment. We'll tell you how it's really performing.</p>
            </div>

            {/* Inverter */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <h2 className="font-medium">Inverter</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>VA rating</label>
                  <input type="number" value={inverterVA} onChange={e => setInverterVA(+e.target.value)} className="input input-mono" />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>W rating</label>
                  <input type="number" value={inverterW} onChange={e => setInverterW(+e.target.value)} className="input input-mono" />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Voltage</label>
                  <select value={systemVoltage} onChange={e => setSystemVoltage(+e.target.value as any)} className="input">
                    <option value={12}>12V</option>
                    <option value={24}>24V</option>
                    <option value={48}>48V</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Battery */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <BatteryIcon className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <h2 className="font-medium">Battery</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Type</label>
                  <select value={batteryId} onChange={e => setBatteryId(e.target.value)} className="input">
                    {batteryCatalog.map(b => (
                      <option key={b.id} value={b.id}>{b.ratedAh}Ah {b.chemistry} ({b.nominalV}V)</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Count</label>
                    <input type="number" min={1} max={8} value={batteryCount} onChange={e => setBatteryCount(+e.target.value)} className="input input-mono" />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Age (years)</label>
                    <input type="number" min={0} max={20} step={0.5} value={batteryAgeYears} onChange={e => setBatteryAgeYears(+e.target.value)} className="input input-mono" />
                  </div>
                </div>
              </div>
            </div>

            {/* Solar */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" style={{ color: '#f59e0b' }} />
                  <h2 className="font-medium">Solar</h2>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={hasSolar} onChange={e => setHasSolar(e.target.checked)} />
                  <span>Has panels</span>
                </label>
              </div>
              {hasSolar && (
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Total Wp</label>
                  <input type="number" value={solarWp} onChange={e => setSolarWp(+e.target.value)} className="input input-mono" />
                </div>
              )}
            </div>

            {/* Loads */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="font-medium mb-4">Your loads</h2>
              <div className="space-y-2">
                {loads.map((l, i) => {
                  const tmpl = applianceTemplates.find(t => t.id === l.templateId);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={l.templateId}
                        onChange={e => {
                          const newLoads = [...loads];
                          newLoads[i] = { ...l, templateId: e.target.value };
                          setLoads(newLoads);
                        }}
                        className="input text-sm flex-1"
                      >
                        {applianceTemplates.filter(t => t.inverterFriendly !== 'avoid').map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.watts}W)</option>
                        ))}
                      </select>
                      <input
                        type="number" min={1} max={20} value={l.qty}
                        onChange={e => {
                          const newLoads = [...loads];
                          newLoads[i] = { ...l, qty: Math.max(1, +e.target.value) };
                          setLoads(newLoads);
                        }}
                        className="input input-mono w-16 text-center text-sm"
                      />
                      <button
                        onClick={() => setLoads(loads.filter((_, j) => j !== i))}
                        className="text-lg" style={{ color: 'var(--muted)' }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setLoads([...loads, { templateId: 'ceiling-fan', qty: 1 }])}
                className="mt-3 text-sm font-medium flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                + Add load
              </button>
            </div>

            {/* Outage pattern */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="font-medium mb-4">Outage pattern</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Outage (min)</label>
                  <input type="number" min={15} max={300} step={15} value={outageMin} onChange={e => setOutageMin(+e.target.value)} className="input input-mono" />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Grid between (min)</label>
                  <input type="number" min={30} max={480} step={15} value={gridMin} onChange={e => setGridMin(+e.target.value)} className="input input-mono" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 self-start space-y-6">
            {/* Health score */}
            <div className="p-6 rounded-3xl" style={{ background: issues[0]?.severity === 'ok' ? 'var(--success-soft)' : issues[0]?.severity === 'critical' ? 'var(--danger-soft)' : 'var(--warning-soft)' }}>
              <div className="eyebrow mb-2">System health</div>
              <div className="flex items-baseline gap-3 mb-2">
                <div className="display-lg">
                  <AnimatedNumber value={effectiveRuntime} decimals={1} />
                </div>
                <div className="text-xl" style={{ color: 'var(--muted)' }}>hours runtime</div>
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                At {totalLoadW.toFixed(0)}W average load. {batteryAgeYears > 0 && `Adjusted for ${batteryAgeYears}y age (×${ageFactor.toFixed(2)} capacity).`}
              </p>
            </div>

            {/* Issues */}
            <div>
              <div className="eyebrow mb-3">Issues found</div>
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl flex items-start gap-3"
                    style={{
                      background: issue.severity === 'ok' ? 'var(--success-soft)' : issue.severity === 'critical' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                      border: `1px solid ${issue.severity === 'ok' ? '#bbf7d0' : issue.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
                    }}
                  >
                    {issue.severity === 'ok' ? (
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    ) : (
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: issue.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }} />
                    )}
                    <div>
                      <p className="font-medium text-sm">{issue.message}</p>
                      <p className="text-xs mt-1 flex items-start gap-1" style={{ color: 'var(--muted)' }}>
                        <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>{issue.fix}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="eyebrow mb-1">Recharge time</div>
                <div className="text-lg num font-medium">
                  {result.closedFormRecharge.toFixed(1)}h
                  <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>/ {gridMin / 60}h window</span>
                </div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="eyebrow mb-1">Min SoC</div>
                <div className="text-lg num font-medium">
                  {result.minSoC.toFixed(0)}%
                  <span className="text-xs ml-1 flex items-center gap-0.5" style={{ color: result.minSoC < 20 ? 'var(--danger)' : 'var(--muted)' }}>
                    {result.minSoC < 20 && (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>low</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Upgrade suggestion */}
            {(sizing.recommendedVA > inverterVA || result.recoveryStatus !== 'yes') && (
              <div className="p-5 rounded-2xl" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
                <div className="eyebrow mb-2" style={{ color: 'var(--accent)' }}>Upgrade path</div>
                <div className="space-y-2 text-sm">
                  {sizing.recommendedVA > inverterVA && (
                    <p className="flex items-start gap-1">
                      <ArrowRight className="w-3 h-3 flex-shrink-0 mt-1" />
                      <span>Upgrade inverter to <strong className="num">{sizing.recommendedVA}VA</strong> for headroom</span>
                    </p>
                  )}
                  {result.recoveryStatus !== 'yes' && (
                    <p className="flex items-start gap-1">
                      <ArrowRight className="w-3 h-3 flex-shrink-0 mt-1" />
                      <span>Add <strong className="num">{sizing.solarWpNeeded}Wp</strong> solar to ensure battery recharges</span>
                    </p>
                  )}
                  {battery.chemistry === 'tubular' && (
                    <p className="flex items-start gap-1">
                      <ArrowRight className="w-3 h-3 flex-shrink-0 mt-1" />
                      <span>Consider switching to LiFePO4 for 3× longer life and 2× usable capacity</span>
                    </p>
                  )}
                </div>
                <button onClick={upgradeToPlanner} className="mt-4 btn-primary text-sm">
                  Explore in planner <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
