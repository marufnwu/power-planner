import { SimulationResult, Project } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Zap, Battery, Sun, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface DashboardProps {
  result: SimulationResult;
  project: Project;
}

export function Dashboard({ result, project }: DashboardProps) {
  // Prepare chart data
  const socData = result.timeSeries
    .filter((_, i) => i % 4 === 0)
    .map(t => ({
      time: `${Math.floor(t.t / 60)}h`,
      soc: Math.round(t.soc),
      load: Math.round(t.loadW),
      solar: Math.round(t.pvW),
    }));

  // Energy breakdown
  const energyData = [
    { name: 'Solar Used', value: result.solarUsedWh / 1000, color: '#f59e0b' },
    { name: 'Grid Used', value: result.gridWh / 1000, color: '#4f46e5' },
    { name: 'Battery Used', value: (result.solarUsedWh + result.gridWh) / 1000 * 0.3, color: '#10b981' },
  ].filter(d => d.value > 0);

  // Daily stats
  const dailyStats = [
    { label: 'Solar Generated', value: (result.solarGeneratedWh / 1000).toFixed(2), unit: 'kWh', icon: Sun, color: '#f59e0b' },
    { label: 'Grid Consumed', value: (result.gridWh / 1000).toFixed(2), unit: 'kWh', icon: Zap, color: '#4f46e5' },
    { label: 'Runtime', value: result.continuousRuntime.toFixed(1), unit: 'hours', icon: Clock, color: '#10b981' },
    { label: 'Min SoC', value: result.minSoC.toFixed(0), unit: '%', icon: Battery, color: result.minSoC < 20 ? '#ef4444' : '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Daily Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {dailyStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-xl transition-all hover:scale-105"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              </div>
              <div className="text-2xl font-bold num" style={{ color: stat.color }}>
                {stat.value}
                <span className="text-sm ml-1" style={{ color: 'var(--muted)' }}>{stat.unit}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* SoC Timeline Chart */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Battery State of Charge</h3>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: '#ff4d1c' }} />
              <span>SoC</span>
            </div>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={socData}>
              <defs>
                <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4d1c" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ff4d1c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--ink)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--paper)',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}%`, 'SoC']}
              />
              <Area
                type="monotone"
                dataKey="soc"
                stroke="#ff4d1c"
                fill="url(#socGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Power Flow Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Load vs Solar */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-4">Power Flow</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={socData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--ink)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--paper)',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="load" stroke="#ff4d1c" fill="#ff4d1c" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="solar" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: '#ff4d1c' }} />
              <span style={{ color: 'var(--muted)' }}>Load</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
              <span style={{ color: 'var(--muted)' }}>Solar</span>
            </div>
          </div>
        </div>

        {/* Energy Breakdown */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-4">Energy Breakdown</h3>
          {energyData.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={energyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {energyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--ink)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'var(--paper)',
                        fontSize: '11px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} kWh`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                {energyData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ background: entry.color }} />
                    <span style={{ color: 'var(--muted)' }}>{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
              No energy data available
            </div>
          )}
        </div>
      </div>

      {/* Recovery Status */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: result.recoveryStatus === 'yes' ? 'var(--success-soft)' : result.recoveryStatus === 'barely' ? 'var(--warning-soft)' : 'var(--danger-soft)',
          border: `1px solid ${result.recoveryStatus === 'yes' ? '#bbf7d0' : result.recoveryStatus === 'barely' ? '#fde68a' : '#fecaca'}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold" style={{ color: result.recoveryStatus === 'yes' ? 'var(--success)' : result.recoveryStatus === 'barely' ? 'var(--warning)' : 'var(--danger)' }}>
              {result.recoveryStatus === 'yes' && '✓ System Recovers'}
              {result.recoveryStatus === 'barely' && '⚠ Barely Recovers'}
              {result.recoveryStatus === 'no' && '✗ Does Not Recover'}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Recharge: {result.closedFormRecharge.toFixed(1)}h · Grid window: {(project.grid.gridMinutes / 60).toFixed(1)}h
            </div>
          </div>
          {result.recoveryStatus === 'yes' ? (
            <TrendingUp className="w-8 h-8" style={{ color: 'var(--success)' }} />
          ) : result.recoveryStatus === 'barely' ? (
            <TrendingUp className="w-8 h-8" style={{ color: 'var(--warning)' }} />
          ) : (
            <TrendingDown className="w-8 h-8" style={{ color: 'var(--danger)' }} />
          )}
        </div>
      </div>
    </div>
  );
}
