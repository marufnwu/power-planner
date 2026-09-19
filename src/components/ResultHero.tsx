import { AnimatedNumber } from './AnimatedNumber';
import { Project, SimulationResult } from '../types';
import { Zap, Battery, Plug, ArrowRight } from 'lucide-react';

interface ResultHeroProps {
  project: Project;
  result: SimulationResult;
  totalLoadW: number;
}

export function ResultHero({ project, result, totalLoadW }: ResultHeroProps) {
  const runtime = result.continuousRuntime;
  const finiteRuntime = Number.isFinite(runtime) && runtime < 100;
  
  // Calculate cycle recovery
  const outageH = project.grid.outageMinutes / 60;
  const gridH = project.grid.gridMinutes / 60;
  const rechargeH = result.closedFormRecharge;
  const recovers = rechargeH <= gridH;
  
  // Plain English summary
  let summary = '';
  if (totalLoadW === 0) {
    summary = 'Add loads to see how long your system will run.';
  } else if (!finiteRuntime) {
    summary = 'Your battery can power this load indefinitely at this rate.';
  } else if (runtime < 1) {
    summary = `That's about ${Math.round(runtime * 60)} minutes — barely enough for a short outage.`;
  } else if (runtime < 3) {
    summary = `Enough for a typical outage, but tight if outages run long.`;
  } else if (runtime < 8) {
    summary = `Solid runtime for most load-shedding patterns.`;
  } else {
    summary = `Excellent — you could ride out a full day of outages.`;
  }
  
  // Add recovery context
  if (finiteRuntime && totalLoadW > 0) {
    if (recovers) {
      summary += ` Battery recovers in ${rechargeH.toFixed(1)}h (you have ${gridH.toFixed(1)}h grid time).`;
    } else {
      summary += ` Battery needs ${rechargeH.toFixed(1)}h to recharge but only has ${gridH.toFixed(1)}h grid time.`;
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.04]" style={{ background: 'var(--accent)' }} />
      
      <div className="relative">
        <div className="eyebrow mb-4">Live result</div>
        
        {/* Big number */}
        <div className="flex items-baseline gap-3 mb-2">
          <div className="display-xl tabular-nums" style={{ color: 'var(--ink)' }}>
            {finiteRuntime ? (
              <AnimatedNumber value={runtime} decimals={1} />
            ) : (
              <span>∞</span>
            )}
          </div>
          <div className="display-md" style={{ color: 'var(--muted)' }}>
            hours
          </div>
        </div>
        
        {/* Context */}
        <p className="text-base md:text-lg mb-6" style={{ color: 'var(--muted)', maxWidth: '48ch' }}>
          Your <span style={{ color: 'var(--ink)' }} className="font-medium">{project.inverter.ratedVA}VA</span> system
          with <span style={{ color: 'var(--ink)' }} className="font-medium">{project.bank.unit.ratedAh}Ah {project.bank.unit.chemistry}</span> battery
          runs <span style={{ color: 'var(--ink)' }} className="font-medium num">{totalLoadW.toFixed(0)}W</span> for this long.
        </p>
        
        <p className="text-sm italic" style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)' }}>
          {summary}
        </p>
        
        {/* Recovery indicator */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`badge ${
              result.recoveryStatus === 'yes' ? 'badge-success' :
              result.recoveryStatus === 'barely' ? 'badge-warning' :
              'badge-danger'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{
                background: result.recoveryStatus === 'yes' ? 'var(--success)' :
                           result.recoveryStatus === 'barely' ? 'var(--warning)' :
                           'var(--danger)'
              }} />
              {result.recoveryStatus === 'yes' && 'Recovers between outages'}
              {result.recoveryStatus === 'barely' && 'Barely recovers'}
              {result.recoveryStatus === 'no' && 'Does not recover'}
            </div>
          </div>
          
          {/* Cycle visualization */}
          <div className="flex items-center gap-2 text-xs num" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {outageH.toFixed(1)}h outage
            </span>
            <ArrowRight className="w-3 h-3" />
            <span className="flex items-center gap-1">
              <Battery className="w-3 h-3" />
              needs {rechargeH.toFixed(1)}h recharge
            </span>
            <ArrowRight className="w-3 h-3" />
            <span className="flex items-center gap-1">
              <Plug className="w-3 h-3" />
              {gridH.toFixed(1)}h grid
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
