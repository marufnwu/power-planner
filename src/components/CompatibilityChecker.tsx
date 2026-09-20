import { Project } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface CompatibilityCheckerProps {
  project: Project;
}

interface CheckResult {
  id: string;
  status: 'pass' | 'warning' | 'fail';
  category: string;
  message: string;
  details?: string;
  recommendation?: string;
}

export function CompatibilityChecker({ project }: CompatibilityCheckerProps) {
  const checks = performCompatibilityChecks(project);
  
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Info className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          Equipment Compatibility Check
        </h2>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} />
            <span className="num font-medium">{passCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            <span className="num font-medium">{warnCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            <span className="num font-medium">{failCount}</span>
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map(check => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckItem({ check }: { check: CheckResult }) {
  const statusStyles = {
    pass: {
      bg: 'var(--success-soft)',
      border: 'var(--success)',
      icon: <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--success)' }} />,
    },
    warning: {
      bg: 'var(--warning-soft)',
      border: 'var(--warning)',
      icon: <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--warning)' }} />,
    },
    fail: {
      bg: 'var(--danger-soft)',
      border: 'var(--danger)',
      icon: <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--danger)' }} />,
    },
  };

  const styles = statusStyles[check.status];

  return (
    <div className="p-3 rounded-lg" style={{ background: styles.bg, border: `1px solid ${styles.border}` }}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--paper-warm)' }}>
              {check.category}
            </span>
          </div>
          <div className="font-medium text-sm">{check.message}</div>
          {check.details && (
            <div className="text-xs mt-1 num" style={{ color: 'var(--muted)' }}>
              {check.details}
            </div>
          )}
          {check.recommendation && (
            <div className="text-xs mt-2 font-medium" style={{ color: styles.border }}>
              → {check.recommendation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function performCompatibilityChecks(project: Project): CheckResult[] {
  const checks: CheckResult[] = [];
  const { inverter, bank, pv, loads } = project;

  // 1. Battery Voltage vs Inverter System Voltage
  const batteryBankVoltage = bank.unit.nominalV * bank.series;
  if (batteryBankVoltage === inverter.systemVoltage) {
    checks.push({
      id: 'voltage-match',
      status: 'pass',
      category: 'Voltage',
      message: 'Battery bank voltage matches inverter',
      details: `${batteryBankVoltage}V = ${inverter.systemVoltage}V`,
    });
  } else {
    checks.push({
      id: 'voltage-match',
      status: 'fail',
      category: 'Voltage',
      message: 'Battery bank voltage does NOT match inverter',
      details: `Battery: ${batteryBankVoltage}V, Inverter: ${inverter.systemVoltage}V`,
      recommendation: `Adjust battery series to ${inverter.systemVoltage / bank.unit.nominalV} batteries in series`,
    });
  }

  // 2. Inverter Capacity vs Load
  const totalLoadW = loads.reduce((sum, l) => sum + l.qty * l.watts, 0);
  const totalLoadVA = loads.reduce((sum, l) => sum + (l.qty * l.watts) / l.powerFactor, 0);
  
  if (totalLoadW <= inverter.ratedW * 0.8) {
    checks.push({
      id: 'inverter-capacity',
      status: 'pass',
      category: 'Inverter',
      message: 'Inverter has sufficient capacity',
      details: `Load: ${totalLoadW}W / ${inverter.ratedW}W (${((totalLoadW / inverter.ratedW) * 100).toFixed(0)}%)`,
    });
  } else if (totalLoadW <= inverter.ratedW) {
    checks.push({
      id: 'inverter-capacity',
      status: 'warning',
      category: 'Inverter',
      message: 'Inverter capacity is tight',
      details: `Load: ${totalLoadW}W / ${inverter.ratedW}W (${((totalLoadW / inverter.ratedW) * 100).toFixed(0)}%)`,
      recommendation: 'Consider larger inverter for headroom',
    });
  } else {
    checks.push({
      id: 'inverter-capacity',
      status: 'fail',
      category: 'Inverter',
      message: 'Inverter is overloaded',
      details: `Load: ${totalLoadW}W exceeds ${inverter.ratedW}W capacity`,
      recommendation: `Upgrade to ${Math.ceil(totalLoadW * 1.25 / 100) * 100}W inverter`,
    });
  }

  // 3. VA Rating Check
  if (totalLoadVA <= inverter.ratedVA * 0.9) {
    checks.push({
      id: 'va-rating',
      status: 'pass',
      category: 'Inverter',
      message: 'VA rating is sufficient',
      details: `Load: ${totalLoadVA.toFixed(0)}VA / ${inverter.ratedVA}VA`,
    });
  } else {
    checks.push({
      id: 'va-rating',
      status: 'fail',
      category: 'Inverter',
      message: 'VA rating exceeded',
      details: `Load: ${totalLoadVA.toFixed(0)}VA exceeds ${inverter.ratedVA}VA`,
      recommendation: 'Upgrade inverter or improve power factor',
    });
  }

  // 4. Surge Capacity Check
  const maxSurge = Math.max(...loads.map(l => l.qty * l.watts * l.surgeMultiplier));
  const surgeCapacity = inverter.surgeW || inverter.ratedW * 2;
  
  if (maxSurge <= surgeCapacity) {
    checks.push({
      id: 'surge-capacity',
      status: 'pass',
      category: 'Surge',
      message: 'Inverter can handle startup surges',
      details: `Max surge: ${maxSurge}W / Capacity: ${surgeCapacity}W`,
    });
  } else {
    checks.push({
      id: 'surge-capacity',
      status: 'fail',
      category: 'Surge',
      message: 'Startup surge exceeds inverter capacity',
      details: `Max surge: ${maxSurge}W exceeds ${surgeCapacity}W`,
      recommendation: 'Upgrade inverter or add soft-start devices',
    });
  }

  // 5. Battery Capacity Check
  const avgLoadW = loads.reduce((sum, l) => {
    const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
    return sum + l.qty * l.watts * l.dutyCycle * avgHourly;
  }, 0);
  
  const outageH = project.grid.outageMinutes / 60;
  const requiredWh = avgLoadW * outageH / 0.88; // Account for inverter efficiency
  const availableWh = bank.unit.nominalV * bank.unit.ratedAh * bank.parallel * bank.unit.usableDoD;
  
  if (availableWh >= requiredWh * 1.2) {
    checks.push({
      id: 'battery-capacity',
      status: 'pass',
      category: 'Battery',
      message: 'Battery has sufficient capacity',
      details: `Available: ${availableWh.toFixed(0)}Wh / Required: ${requiredWh.toFixed(0)}Wh`,
    });
  } else if (availableWh >= requiredWh) {
    checks.push({
      id: 'battery-capacity',
      status: 'warning',
      category: 'Battery',
      message: 'Battery capacity is tight',
      details: `Available: ${availableWh.toFixed(0)}Wh / Required: ${requiredWh.toFixed(0)}Wh`,
      recommendation: 'Consider larger battery for safety margin',
    });
  } else {
    checks.push({
      id: 'battery-capacity',
      status: 'fail',
      category: 'Battery',
      message: 'Battery capacity insufficient',
      details: `Available: ${availableWh.toFixed(0)}Wh < Required: ${requiredWh.toFixed(0)}Wh`,
      recommendation: `Upgrade to ${Math.ceil(requiredWh * 1.2 / (bank.unit.nominalV * bank.unit.usableDoD))}Ah battery`,
    });
  }

  // 6. Battery Discharge Current Check
  const maxDischargeA = availableWh > 0 ? (avgLoadW / 0.88) / bank.unit.nominalV : 0;
  const batteryMaxDischargeA = bank.unit.maxDischargeA || bank.unit.ratedAh;
  
  if (maxDischargeA <= batteryMaxDischargeA * 0.8) {
    checks.push({
      id: 'discharge-current',
      status: 'pass',
      category: 'Battery',
      message: 'Discharge current within limits',
      details: `Max: ${maxDischargeA.toFixed(1)}A / Limit: ${batteryMaxDischargeA}A`,
    });
  } else if (maxDischargeA <= batteryMaxDischargeA) {
    checks.push({
      id: 'discharge-current',
      status: 'warning',
      category: 'Battery',
      message: 'Discharge current near limit',
      details: `Max: ${maxDischargeA.toFixed(1)}A / Limit: ${batteryMaxDischargeA}A`,
      recommendation: 'Consider larger battery or reduce load',
    });
  } else {
    checks.push({
      id: 'discharge-current',
      status: 'fail',
      category: 'Battery',
      message: 'Discharge current exceeds BMS limit',
      details: `Max: ${maxDischargeA.toFixed(1)}A > Limit: ${batteryMaxDischargeA}A`,
      recommendation: 'Upgrade battery or add parallel strings',
    });
  }

  // 7. Solar MPPT Compatibility (if solar exists)
  if (pv) {
    const solarWp = pv.panel.wp * pv.series * pv.parallelStrings;
    const mpptMaxW = inverter.mppt?.maxPvW || 0;
    
    if (mpptMaxW > 0) {
      if (solarWp <= mpptMaxW) {
        checks.push({
          id: 'solar-mppt',
          status: 'pass',
          category: 'Solar',
          message: 'Solar array within MPPT limits',
          details: `Array: ${solarWp}W / MPPT Max: ${mpptMaxW}W`,
        });
      } else if (solarWp <= mpptMaxW * 1.3) {
        checks.push({
          id: 'solar-mppt',
          status: 'warning',
          category: 'Solar',
          message: 'Solar array slightly oversized',
          details: `Array: ${solarWp}W / MPPT Max: ${mpptMaxW}W (${((solarWp / mpptMaxW) * 100).toFixed(0)}%)`,
          recommendation: 'Consider reducing array or upgrading MPPT',
        });
      } else {
        checks.push({
          id: 'solar-mppt',
          status: 'fail',
          category: 'Solar',
          message: 'Solar array exceeds MPPT capacity',
          details: `Array: ${solarWp}W > MPPT Max: ${mpptMaxW}W`,
          recommendation: `Reduce array to ${mpptMaxW}W or upgrade inverter`,
        });
      }
    }

    // 8. Solar Voltage Check
    const stringVoc = pv.panel.voc * pv.series;
    const mpptMaxVoc = inverter.mppt?.maxPvVoc || 0;
    
    if (mpptMaxVoc > 0) {
      if (stringVoc <= mpptMaxVoc * 0.95) {
        checks.push({
          id: 'solar-voltage',
          status: 'pass',
          category: 'Solar',
          message: 'String voltage within MPPT range',
          details: `String Voc: ${stringVoc.toFixed(1)}V / Max: ${mpptMaxVoc}V`,
        });
      } else {
        checks.push({
          id: 'solar-voltage',
          status: 'fail',
          category: 'Solar',
          message: 'String voltage exceeds MPPT limit',
          details: `String Voc: ${stringVoc.toFixed(1)}V > Max: ${mpptMaxVoc}V`,
          recommendation: `Reduce series panels to ${Math.floor(mpptMaxVoc * 0.95 / pv.panel.voc)}`,
        });
      }
    }
  }

  // 9. Lead-Acid DoD Check
  if (bank.unit.chemistry === 'tubular' || bank.unit.chemistry === 'flooded') {
    const dailyDischargeWh = avgLoadW * outageH;
    const batteryCapacityWh = bank.unit.nominalV * bank.unit.ratedAh * bank.parallel;
    const dailyDoD = dailyDischargeWh / batteryCapacityWh;
    
    if (dailyDoD <= 0.5) {
      checks.push({
        id: 'lead-acid-dod',
        status: 'pass',
        category: 'Battery',
        message: 'Daily DoD within safe range for lead-acid',
        details: `Daily DoD: ${(dailyDoD * 100).toFixed(1)}% / Max: 50%`,
      });
    } else {
      checks.push({
        id: 'lead-acid-dod',
        status: 'warning',
        category: 'Battery',
        message: 'Daily DoD exceeds recommended for lead-acid',
        details: `Daily DoD: ${(dailyDoD * 100).toFixed(1)}% > Recommended: 50%`,
        recommendation: 'Switch to LiFePO4 or increase battery capacity',
      });
    }
  }

  // 10. Parallel Strings Check (for lead-acid)
  if ((bank.unit.chemistry === 'tubular' || bank.unit.chemistry === 'flooded') && bank.parallel > 3) {
    checks.push({
      id: 'parallel-strings',
      status: 'warning',
      category: 'Battery',
      message: 'Too many parallel strings for lead-acid',
      details: `${bank.parallel} parallel strings (recommended: ≤3)`,
      recommendation: 'Use larger individual batteries to reduce parallel count',
    });
  }

  return checks;
}
