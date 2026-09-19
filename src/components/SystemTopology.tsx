import { useMemo } from 'react';

interface SystemTopologyProps {
  gridAvailable: boolean;
  solarW: number;
  batterySoC: number;
  loadW: number;
  batteryCharging: boolean;
  inverterOn: boolean;
}

export function SystemTopology({
  gridAvailable,
  solarW,
  batterySoC,
  loadW,
  batteryCharging,
  inverterOn,
}: SystemTopologyProps) {
  // Power flow magnitudes (normalized for visual thickness)
  const solarFlow = Math.min(solarW / 1000, 1);
  const loadFlow = Math.min(loadW / 1000, 1);

  return (
    <div className="relative w-full aspect-[16/9] max-h-[360px]">
      <svg viewBox="0 0 800 400" className="w-full h-full" style={{ fontFamily: 'var(--font-mono)' }}>
        <defs>
          <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>

        {/* ===== GRID (top-left) ===== */}
        <g transform="translate(80, 80)">
          {/* Pole */}
          <rect x="-2" y="-40" width="4" height="80" fill="#0a0a0a" opacity="0.3" />
          <rect x="-30" y="-40" width="60" height="3" fill="#0a0a0a" opacity="0.3" />
          <rect x="-30" y="-30" width="60" height="3" fill="#0a0a0a" opacity="0.3" />
          {/* Label */}
          <text x="0" y="60" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)">GRID</text>
          <text x="0" y="76" textAnchor="middle" fontSize="10" fill={gridAvailable ? '#1a7f37' : '#c2410c'} fontFamily="var(--font-mono)" fontWeight="600">
            {gridAvailable ? '● LIVE' : '○ OUT'}
          </text>
        </g>

        {/* ===== SOLAR (top-right) ===== */}
        <g transform="translate(680, 80)">
          {/* Sun */}
          <circle cx="0" cy="-20" r="14" fill="#fbbf24" opacity={solarW > 0 ? 1 : 0.3} />
          {solarW > 0 && (
            <g opacity="0.6">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <line
                  key={i}
                  x1={Math.cos((angle * Math.PI) / 180) * 18}
                  y1={-20 + Math.sin((angle * Math.PI) / 180) * 18}
                  x2={Math.cos((angle * Math.PI) / 180) * 24}
                  y2={-20 + Math.sin((angle * Math.PI) / 180) * 24}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}
          {/* Panel */}
          <rect x="-30" y="10" width="60" height="36" rx="2" fill="#1e3a8a" stroke="#0a0a0a" strokeWidth="1" />
          <line x1="-30" y1="22" x2="30" y2="22" stroke="#3b82f6" strokeWidth="0.5" />
          <line x1="-30" y1="34" x2="30" y2="34" stroke="#3b82f6" strokeWidth="0.5" />
          <line x1="-10" y1="10" x2="-10" y2="46" stroke="#3b82f6" strokeWidth="0.5" />
          <line x1="10" y1="10" x2="10" y2="46" stroke="#3b82f6" strokeWidth="0.5" />
          {/* Label */}
          <text x="0" y="68" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)">SOLAR</text>
          <text x="0" y="84" textAnchor="middle" fontSize="11" fill="#0a0a0a" fontFamily="var(--font-mono)" fontWeight="600">
            {solarW > 0 ? `${Math.round(solarW)}W` : '—'}
          </text>
        </g>

        {/* ===== INVERTER (center) ===== */}
        <g transform="translate(400, 200)">
          <rect x="-70" y="-50" width="140" height="100" rx="8" fill="#0a0a0a" />
          <rect x="-66" y="-46" width="132" height="92" rx="6" fill="#1a1a1a" />
          {/* Display */}
          <rect x="-50" y="-30" width="100" height="30" rx="2" fill="#0f172a" />
          <text x="0" y="-10" textAnchor="middle" fontSize="14" fill={inverterOn ? '#10b981' : '#6b6b6b'} fontFamily="var(--font-mono)" fontWeight="600">
            {inverterOn ? 'ON' : 'OFF'}
          </text>
          {/* Vents */}
          {[-30, -10, 10, 30].map((x, i) => (
            <rect key={i} x={x - 3} y="15" width="6" height="2" fill="#333" rx="1" />
          ))}
          {/* Label */}
          <text x="0" y="70" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)">INVERTER</text>
        </g>

        {/* ===== BATTERY (bottom-left) ===== */}
        <g transform="translate(180, 300)">
          {/* Battery body */}
          <rect x="-50" y="-30" width="100" height="60" rx="4" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="1.5" />
          {/* Terminal */}
          <rect x="-15" y="-36" width="30" height="8" rx="2" fill="#0a0a0a" />
          {/* Fill level */}
          <rect
            x="-46"
            y={26 - (batterySoC / 100) * 52}
            width="92"
            height={(batterySoC / 100) * 52}
            rx="2"
            fill="url(#batteryGrad)"
            opacity="0.9"
          />
          {/* SoC text */}
          <text x="0" y="5" textAnchor="middle" fontSize="16" fill="white" fontFamily="var(--font-mono)" fontWeight="600">
            {Math.round(batterySoC)}%
          </text>
          {/* Label */}
          <text x="0" y="55" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)">BATTERY</text>
          <text x="0" y="70" textAnchor="middle" fontSize="10" fill={batteryCharging ? '#1a7f37' : '#b45309'} fontFamily="var(--font-mono)">
            {batteryCharging ? '↻ CHARGING' : '↯ DISCHARGING'}
          </text>
        </g>

        {/* ===== LOADS (bottom-right) ===== */}
        <g transform="translate(620, 300)">
          {/* House */}
          <path d="M -30 -10 L 0 -35 L 30 -10 L 30 25 L -30 25 Z" fill="#fafaf7" stroke="#0a0a0a" strokeWidth="1.5" />
          <rect x="-8" y="5" width="16" height="20" fill="#0a0a0a" />
          {/* Light bulb (animated) */}
          <circle cx="0" cy="-5" r="4" fill={loadW > 0 ? '#fbbf24' : '#e5e2db'}>
            {loadW > 0 && (
              <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
            )}
          </circle>
          {/* Label */}
          <text x="0" y="50" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)">LOADS</text>
          <text x="0" y="65" textAnchor="middle" fontSize="11" fill="#0a0a0a" fontFamily="var(--font-mono)" fontWeight="600">
            {loadW > 0 ? `${Math.round(loadW)}W` : '—'}
          </text>
        </g>

        {/* ===== POWER FLOW LINES ===== */}
        {/* Grid → Inverter */}
        <path
          d="M 140 110 Q 250 150 330 180"
          fill="none"
          stroke={gridAvailable ? '#6366f1' : '#e5e2db'}
          strokeWidth={gridAvailable ? 2.5 : 1}
          strokeDasharray={gridAvailable ? '6 4' : '0'}
          opacity={gridAvailable ? 0.8 : 0.3}
          className={gridAvailable ? 'animate-dash-flow' : ''}
        />

        {/* Solar → Inverter */}
        <path
          d="M 650 130 Q 550 160 470 180"
          fill="none"
          stroke={solarW > 0 ? '#f59e0b' : '#e5e2db'}
          strokeWidth={solarW > 0 ? 1.5 + solarFlow * 2 : 1}
          strokeDasharray={solarW > 0 ? '6 4' : '0'}
          opacity={solarW > 0 ? 0.8 : 0.3}
          className={solarW > 0 ? 'animate-dash-flow' : ''}
        />

        {/* Inverter → Battery */}
        <path
          d="M 340 230 Q 280 260 230 280"
          fill="none"
          stroke={batteryCharging ? '#10b981' : '#f59e0b'}
          strokeWidth={1.5 + loadFlow * 2}
          strokeDasharray="6 4"
          opacity="0.8"
          className="animate-dash-flow"
          style={{ animationDirection: batteryCharging ? 'normal' : 'reverse' }}
        />

        {/* Inverter → Loads */}
        <path
          d="M 460 230 Q 520 260 570 280"
          fill="none"
          stroke={loadW > 0 ? '#0a0a0a' : '#e5e2db'}
          strokeWidth={loadW > 0 ? 1.5 + loadFlow * 2 : 1}
          strokeDasharray={loadW > 0 ? '6 4' : '0'}
          opacity={loadW > 0 ? 0.8 : 0.3}
          className={loadW > 0 ? 'animate-dash-flow' : ''}
        />
      </svg>
    </div>
  );
}
