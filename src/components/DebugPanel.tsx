import { useState } from 'react';
import { Project, SimulationResult } from '../types';
import { CalculationSettings } from './AdvancedSettings';
import { ChevronDown, ChevronUp, Bug, Copy, Check } from 'lucide-react';

interface DebugPanelProps {
  project: Project;
  enhancedProject: Project;
  result: SimulationResult;
  calcSettings: CalculationSettings;
}

export function DebugPanel({ project, enhancedProject, result, calcSettings }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inputs' | 'corrections' | 'calculations' | 'results'>('inputs');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      inputs: project,
      corrections: calcSettings,
      enhancedProject: enhancedProject,
      results: result,
    };
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-50 transition-all hover:scale-110"
        style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        aria-label="Open debug panel"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--paper)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold">Debug Panel</h2>
            <span className="badge badge-outline text-xs">Development</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy All'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-ghost text-xs"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {(['inputs', 'corrections', 'calculations', 'results'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab ? 'var(--paper-warm)' : 'transparent',
                color: activeTab === tab ? 'var(--ink)' : 'var(--muted)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'inputs' && (
            <div className="space-y-4">
              <DebugSection title="Project Configuration">
                <DebugObject data={project} />
              </DebugSection>
              
              <DebugSection title="Loads">
                {project.loads.map((load, i) => (
                  <div key={i} className="p-3 rounded-lg mb-2" style={{ background: 'var(--paper-warm)' }}>
                    <div className="font-medium text-sm mb-2">{load.label}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Qty: <span className="num font-medium">{load.qty}</span></div>
                      <div>Watts: <span className="num font-medium">{load.watts}W</span></div>
                      <div>PF: <span className="num font-medium">{load.powerFactor}</span></div>
                      <div>Duty: <span className="num font-medium">{(load.dutyCycle * 100).toFixed(0)}%</span></div>
                      <div>Surge: <span className="num font-medium">{load.surgeMultiplier}×</span></div>
                      <div>Profile: <span className="font-medium">{load.usageProfile}</span></div>
                      <div>Backup: <span className="font-medium">{load.onBackupCircuit ? 'Yes' : 'No'}</span></div>
                      <div>Avg Hourly: <span className="num font-medium">{(load.hourly.reduce((a, b) => a + b, 0) / 24 * 100).toFixed(0)}%</span></div>
                    </div>
                  </div>
                ))}
              </DebugSection>

              <DebugSection title="Grid Configuration">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>Outage: <span className="num font-medium">{project.grid.outageMinutes}min</span></div>
                  <div>Grid: <span className="num font-medium">{project.grid.gridMinutes}min</span></div>
                  <div>Mode: <span className="font-medium">{project.options.mode}</span></div>
                  <div>Assumption: <span className="font-medium">{project.options.assumptionSet}</span></div>
                </div>
              </DebugSection>
            </div>
          )}

          {activeTab === 'corrections' && (
            <div className="space-y-4">
              <DebugSection title="Advanced Settings (calcSettings)">
                <DebugObject data={calcSettings} />
              </DebugSection>

              <DebugSection title="Applied Corrections">
                <div className="space-y-2">
                  <CorrectionRow
                    label="Temperature"
                    value={calcSettings.batteryRoomTempC}
                    unit="°C"
                    impact={calcSettings.batteryRoomTempC !== 25 ? `${((25 - calcSettings.batteryRoomTempC) * 0.5).toFixed(1)}%` : '0%'}
                    active={calcSettings.batteryRoomTempC !== 25}
                  />
                  <CorrectionRow
                    label="Battery Age"
                    value={calcSettings.batteryAgeYears}
                    unit="years"
                    impact={calcSettings.batteryAgeYears > 0 ? `-${(calcSettings.batteryAgeYears * 2).toFixed(0)}%` : '0%'}
                    active={calcSettings.batteryAgeYears > 0}
                  />
                  <CorrectionRow
                    label="Battery Health"
                    value={calcSettings.batteryHealthPct}
                    unit="%"
                    impact={calcSettings.batteryHealthPct !== 100 ? `-${(100 - calcSettings.batteryHealthPct).toFixed(0)}%` : '0%'}
                    active={calcSettings.batteryHealthPct !== 100}
                  />
                  <CorrectionRow
                    label="Inverter Efficiency"
                    value={calcSettings.inverterEfficiencyPct}
                    unit="%"
                    impact={calcSettings.inverterEfficiencyPct !== 90 ? `${((90 - calcSettings.inverterEfficiencyPct) * 1).toFixed(1)}%` : '0%'}
                    active={calcSettings.inverterEfficiencyPct !== 90}
                  />
                  <CorrectionRow
                    label="System Losses"
                    value={calcSettings.wiringLossPct + calcSettings.soilingLossPct + calcSettings.mismatchLossPct}
                    unit="%"
                    impact={`-${(calcSettings.wiringLossPct + calcSettings.soilingLossPct + calcSettings.mismatchLossPct).toFixed(1)}%`}
                    active={(calcSettings.wiringLossPct + calcSettings.soilingLossPct + calcSettings.mismatchLossPct) > 0}
                  />
                  <CorrectionRow
                    label="Diversity Factor"
                    value={calcSettings.diversityFactor}
                    unit=""
                    impact={`${((1 - calcSettings.diversityFactor) * 100).toFixed(0)}% reduction`}
                    active={calcSettings.diversityFactor !== 1}
                  />
                  <CorrectionRow
                    label="Safety Margin"
                    value={calcSettings.inverterSafetyMarginPct}
                    unit="%"
                    impact={`+${calcSettings.inverterSafetyMarginPct}%`}
                    active={calcSettings.inverterSafetyMarginPct > 0}
                  />
                </div>
              </DebugSection>

              <DebugSection title="Enhanced Project (After Corrections)">
                <DebugObject data={enhancedProject} />
              </DebugSection>
            </div>
          )}

          {activeTab === 'calculations' && (
            <div className="space-y-4">
              <DebugSection title="Calculation Steps">
                <div className="space-y-3">
                  <CalcStep
                    step={1}
                    title="Load Calculation"
                    formula="Total Load = Σ(qty × watts × dutyCycle × hourly × diversity)"
                    result={`${result.timeSeries[0]?.loadW.toFixed(0) || 0}W`}
                  />
                  <CalcStep
                    step={2}
                    title="DC Draw"
                    formula="DC Watts = AC Watts / Efficiency + Idle"
                    result={`${(result.timeSeries[0]?.loadW || 0) / 0.9 + project.inverter.idleW}W`}
                  />
                  <CalcStep
                    step={3}
                    title="Battery Capacity"
                    formula="Energy = Voltage × Ah × DoD × Health × Age"
                    result={`${(enhancedProject.bank.unit.nominalV * enhancedProject.bank.unit.ratedAh * enhancedProject.bank.unit.usableDoD / 1000).toFixed(2)} kWh`}
                  />
                  <CalcStep
                    step={4}
                    title="Runtime"
                    formula="Runtime = Usable Energy / DC Watts"
                    result={`${result.continuousRuntime.toFixed(1)}h`}
                  />
                  <CalcStep
                    step={5}
                    title="Recharge Time"
                    formula="Recharge = Energy Removed / Charge Power"
                    result={`${result.closedFormRecharge.toFixed(1)}h`}
                  />
                  <CalcStep
                    step={6}
                    title="Solar Production"
                    formula="Solar = Wp × PSH × Derate × Temp × Degradation"
                    result={`${(result.solarGeneratedWh / 1000).toFixed(2)} kWh/day`}
                  />
                </div>
              </DebugSection>

              <DebugSection title="Simulation Details">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>Steps: <span className="num font-medium">{result.timeSeries.length}</span></div>
                  <div>Step Size: <span className="num font-medium">15min</span></div>
                  <div>Days: <span className="num font-medium">{project.options.simulationDays}</span></div>
                  <div>Initial SoC: <span className="num font-medium">{project.options.initialSoC}%</span></div>
                  <div>Min SoC: <span className="num font-medium">{result.minSoC.toFixed(1)}%</span></div>
                  <div>Avg DoD: <span className="num font-medium">{(result.avgDoD * 100).toFixed(1)}%</span></div>
                  <div>Cycles/Day: <span className="num font-medium">{result.cyclesPerDay.toFixed(2)}</span></div>
                  <div>Recovery: <span className="font-medium">{result.recoveryStatus}</span></div>
                </div>
              </DebugSection>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-4">
              <DebugSection title="Simulation Results">
                <DebugObject data={result} />
              </DebugSection>

              <DebugSection title="Warnings">
                {result.warnings.length === 0 ? (
                  <div className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
                    No warnings
                  </div>
                ) : (
                  <div className="space-y-2">
                    {result.warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg text-sm"
                        style={{
                          background: warning.severity === 'critical' ? 'var(--danger-soft)' : warning.severity === 'warn' ? 'var(--warning-soft)' : 'var(--info-soft)',
                          border: `1px solid ${warning.severity === 'critical' ? '#fecaca' : warning.severity === 'warn' ? '#fde68a' : '#bfdbfe'}`,
                        }}
                      >
                        <div className="font-medium">{warning.id}</div>
                        <div className="text-xs mt-1">{warning.message}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>→ {warning.suggestedFix}</div>
                      </div>
                    ))}
                  </div>
                )}
              </DebugSection>

              <DebugSection title="Energy Balance">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>Solar Generated: <span className="num font-medium">{(result.solarGeneratedWh / 1000).toFixed(2)} kWh</span></div>
                  <div>Solar Used: <span className="num font-medium">{(result.solarUsedWh / 1000).toFixed(2)} kWh</span></div>
                  <div>Solar Clipped: <span className="num font-medium">{(result.solarClippedWh / 1000).toFixed(2)} kWh</span></div>
                  <div>Grid Used: <span className="num font-medium">{(result.gridWh / 1000).toFixed(2)} kWh</span></div>
                  <div>Unserved: <span className="num font-medium">{(result.unservedWh / 1000).toFixed(2)} kWh</span></div>
                  <div>Efficiency: <span className="num font-medium">{((result.solarUsedWh / result.solarGeneratedWh) * 100 || 0).toFixed(1)}%</span></div>
                </div>
              </DebugSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebugSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>{title}</h3>
      {children}
    </div>
  );
}

function DebugObject({ data }: { data: any }) {
  return (
    <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ background: 'var(--paper-warm)', color: 'var(--ink)' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function CorrectionRow({ label, value, unit, impact, active }: {
  label: string;
  value: number;
  unit: string;
  impact: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: active ? 'var(--success-soft)' : 'var(--paper-warm)' }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: active ? 'var(--success)' : 'var(--muted)' }} />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="num" style={{ color: 'var(--muted)' }}>{value}{unit}</span>
        <span className="num font-medium" style={{ color: active ? 'var(--success)' : 'var(--muted)' }}>{impact}</span>
      </div>
    </div>
  );
}

function CalcStep({ step, title, formula, result }: {
  step: number;
  title: string;
  formula: string;
  result: string;
}) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: 'var(--paper)' }}>
          {step}
        </div>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
        Formula: <span className="num">{formula}</span>
      </div>
      <div className="text-sm">
        Result: <span className="num font-medium" style={{ color: 'var(--accent)' }}>{result}</span>
      </div>
    </div>
  );
}
