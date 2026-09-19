import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Project, SimulationResult } from '../types';
import { decodeProject, encodeProject } from '../lib/state';
import { runSimulation, calculateContinuousRuntime, calculateSizing } from '../lib/engine/calculator';
import { ArrowLeft, Trash2, Plus, Share2, Download } from 'lucide-react';
import { AnimatedNumber } from '../components/AnimatedNumber';

interface SavedConfig {
  id: string;
  name: string;
  project: Project;
  result: SimulationResult;
  timestamp: number;
}

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [newName, setNewName] = useState('');

  // Load from URL if present
  useEffect(() => {
    const configsParam = searchParams.get('configs');
    if (configsParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(configsParam));
        setConfigs(parsed.map((c: any) => ({
          ...c,
          project: decodeProject(c.encoded)!,
          result: runSimulation(decodeProject(c.encoded)!),
        })));
      } catch (e) {
        console.error('Failed to load configs', e);
      }
    }
  }, [searchParams]);

  const addFromCurrentPlanner = () => {
    const currentUrl = window.location.href;
    const sParam = new URL(currentUrl).searchParams.get('s');
    if (!sParam) return;

    const project = decodeProject(sParam);
    if (!project) return;

    const name = newName || `Config ${configs.length + 1}`;
    const result = runSimulation(project);

    const newConfig: SavedConfig = {
      id: `config-${Date.now()}`,
      name,
      project,
      result,
      timestamp: Date.now(),
    };

    setConfigs([...configs, newConfig]);
    setNewName('');
  };

  const removeConfig = (id: string) => {
    setConfigs(configs.filter(c => c.id !== id));
  };

  const shareComparison = () => {
    const shareData = configs.map(c => ({
      id: c.id,
      name: c.name,
      encoded: encodeProject(c.project),
      timestamp: c.timestamp,
    }));
    const url = `${window.location.origin}/compare?configs=${encodeURIComponent(JSON.stringify(shareData))}`;
    navigator.clipboard.writeText(url);
  };

  if (configs.length === 0) {
    return (
      <div className="pt-24 pb-16">
        <div className="container-narrow">
          <div className="eyebrow mb-3">Compare</div>
          <h1 className="display-lg mb-4">Compare configurations</h1>
          <p className="text-base mb-8" style={{ color: 'var(--muted)' }}>
            Compare up to 3 different system setups side-by-side to see which works best for your needs.
          </p>

          <div className="p-8 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-medium mb-2">No configurations to compare</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Create configurations in the planner, then come back here to compare them.
            </p>
            <Link to="/plan" className="btn-primary">
              Open planner →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="container-ultra">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="eyebrow mb-2">Compare</div>
            <h1 className="display-lg">Configuration comparison</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareComparison} className="btn-secondary text-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            {configs.length < 3 && (
              <button onClick={addFromCurrentPlanner} className="btn-primary text-sm">
                <Plus className="w-4 h-4" />
                Add current
              </button>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--paper-warm)' }}>
                  <th className="text-left py-4 px-6 font-medium text-sm" style={{ color: 'var(--muted)' }}>
                    Metric
                  </th>
                  {configs.map(config => (
                    <th key={config.id} className="text-left py-4 px-6 font-medium text-sm">
                      <div className="flex items-center justify-between">
                        <span>{config.name}</span>
                        <button
                          onClick={() => removeConfig(config.id)}
                          className="p-1 rounded hover:bg-[var(--border)] transition-colors"
                        >
                          <Trash2 className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  label="Runtime"
                  values={configs.map(c => `${c.result.continuousRuntime.toFixed(1)}h`)}
                  highlight="max"
                />
                <ComparisonRow
                  label="Recharge time"
                  values={configs.map(c => `${c.result.closedFormRecharge.toFixed(1)}h`)}
                  highlight="min"
                />
                <ComparisonRow
                  label="Min SoC"
                  values={configs.map(c => `${c.result.minSoC.toFixed(0)}%`)}
                  highlight="max"
                />
                <ComparisonRow
                  label="Recovery"
                  values={configs.map(c => 
                    c.result.recoveryStatus === 'yes' ? '✓ Yes' :
                    c.result.recoveryStatus === 'barely' ? '⚠ Barely' : '✗ No'
                  )}
                />
                <ComparisonRow
                  label="Inverter"
                  values={configs.map(c => `${c.project.inverter.ratedVA}VA`)}
                />
                <ComparisonRow
                  label="Battery"
                  values={configs.map(c => `${c.project.bank.unit.ratedAh}Ah ${c.project.bank.unit.chemistry}`)}
                />
                <ComparisonRow
                  label="Bank config"
                  values={configs.map(c => `${c.project.bank.series}S${c.project.bank.parallel}P`)}
                />
                <ComparisonRow
                  label="Total energy"
                  values={configs.map(c => {
                    const total = c.project.bank.unit.nominalV * c.project.bank.series * 
                                 c.project.bank.unit.ratedAh * c.project.bank.parallel;
                    return `${(total / 1000).toFixed(2)} kWh`;
                  })}
                  highlight="max"
                />
                <ComparisonRow
                  label="Usable energy"
                  values={configs.map(c => {
                    const total = c.project.bank.unit.nominalV * c.project.bank.series * 
                                 c.project.bank.unit.ratedAh * c.project.bank.parallel *
                                 c.project.bank.unit.usableDoD;
                    return `${(total / 1000).toFixed(2)} kWh`;
                  })}
                  highlight="max"
                />
                {configs[0]?.project.pv && (
                  <ComparisonRow
                    label="Solar"
                    values={configs.map(c => 
                      c.project.pv ? `${c.project.pv.panel.wp * c.project.pv.series * c.project.pv.parallelStrings}Wp` : '—'
                    )}
                  />
                )}
                <ComparisonRow
                  label="Outage pattern"
                  values={configs.map(c => `${c.project.grid.outageMinutes}min / ${c.project.grid.gridMinutes}min`)}
                />
                <ComparisonRow
                  label="Avg load"
                  values={configs.map(c => {
                    const load = c.project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => {
                      const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
                      return s + l.qty * l.watts * l.dutyCycle * avgHourly;
                    }, 0);
                    return `${load.toFixed(0)}W`;
                  })}
                />
                <ComparisonRow
                  label="Warnings"
                  values={configs.map(c => {
                    const critical = c.result.warnings.filter(w => w.severity === 'critical').length;
                    const warn = c.result.warnings.filter(w => w.severity === 'warn').length;
                    return critical > 0 ? `${critical} critical` : warn > 0 ? `${warn} warnings` : '✓ None';
                  })}
                  highlight="min"
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        {configs.length >= 2 && (
          <div className="mt-8 p-6 rounded-2xl" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-4">Analysis</h2>
            <div className="space-y-3 text-sm">
              {getRecommendations(configs).map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span style={{ color: 'var(--accent)' }}>→</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add more */}
        {configs.length < 3 && (
          <div className="mt-8 p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-medium mb-3">Add another configuration</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Configuration name (optional)"
                className="input flex-1"
              />
              <button onClick={addFromCurrentPlanner} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add current
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Create a configuration in the planner, then add it here for comparison.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({ label, values, highlight }: {
  label: string;
  values: string[];
  highlight?: 'max' | 'min';
}) {
  let bestIndex = -1;
  
  if (highlight && values.length > 1) {
    const numericValues = values.map(v => parseFloat(v));
    if (highlight === 'max') {
      bestIndex = numericValues.indexOf(Math.max(...numericValues));
    } else {
      bestIndex = numericValues.indexOf(Math.min(...numericValues));
    }
  }

  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td className="py-3 px-6 text-sm font-medium" style={{ color: 'var(--muted)' }}>
        {label}
      </td>
      {values.map((value, i) => (
        <td key={i} className="py-3 px-6 text-sm">
          <span
            className="num font-medium"
            style={{
              color: i === bestIndex ? 'var(--success)' : 'var(--ink)',
              background: i === bestIndex ? 'var(--success-soft)' : 'transparent',
              padding: i === bestIndex ? '2px 6px' : '0',
              borderRadius: '4px',
            }}
          >
            {value}
          </span>
        </td>
      ))}
    </tr>
  );
}

function getRecommendations(configs: SavedConfig[]): string[] {
  const recommendations: string[] = [];
  
  // Find best runtime
  const runtimes = configs.map(c => c.result.continuousRuntime);
  const maxRuntime = Math.max(...runtimes);
  const bestRuntimeConfig = configs[runtimes.indexOf(maxRuntime)];
  recommendations.push(
    `${bestRuntimeConfig.name} offers the longest runtime at ${maxRuntime.toFixed(1)} hours.`
  );
  
  // Find best recovery
  const recovering = configs.filter(c => c.result.recoveryStatus === 'yes');
  if (recovering.length > 0 && recovering.length < configs.length) {
    recommendations.push(
      `${recovering.map(c => c.name).join(' and ')} can fully recover between outages, while others cannot.`
    );
  }
  
  // Find most cost-effective
  const costs = configs.map(c => {
    const batteryCost = (c.project.bank.unit.price || 0) * c.project.bank.series * c.project.bank.parallel;
    const panelCost = c.project.pv ? (c.project.pv.panel.price || 0) * c.project.pv.series * c.project.pv.parallelStrings : 0;
    return batteryCost + panelCost + 15000; // inverter cost
  });
  const minCost = Math.min(...costs);
  const cheapestConfig = configs[costs.indexOf(minCost)];
  recommendations.push(
    `${cheapestConfig.name} is the most affordable at ৳${minCost.toLocaleString()}.`
  );
  
  // Warnings
  const noWarnings = configs.filter(c => c.result.warnings.filter(w => w.severity === 'critical').length === 0);
  if (noWarnings.length > 0 && noWarnings.length < configs.length) {
    recommendations.push(
      `${noWarnings.map(c => c.name).join(' and ')} have no critical warnings, making them safer choices.`
    );
  }
  
  return recommendations;
}
