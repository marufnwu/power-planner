import { BatteryUnit } from '../types';

interface BatteryGraphicProps {
  battery: BatteryUnit;
  soc: number;
  charging: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BatteryGraphic({ battery, soc, charging, size = 'md' }: BatteryGraphicProps) {
  const dimensions = {
    sm: { width: 60, height: 100 },
    md: { width: 80, height: 140 },
    lg: { width: 120, height: 200 },
  };

  const { width, height } = dimensions[size];
  const fillHeight = (soc / 100) * (height - 20);

  return (
    <div className="relative inline-block">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Battery body */}
        <rect
          x="5"
          y="10"
          width={width - 10}
          height={height - 20}
          rx="4"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="2"
        />
        
        {/* Battery terminal */}
        <rect
          x={width / 2 - 10}
          y="0"
          width="20"
          height="12"
          rx="2"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="2"
        />
        
        {/* Fill level */}
        <rect
          x="8"
          y={height - 10 - fillHeight}
          width={width - 16}
          height={fillHeight}
          rx="2"
          fill={
            soc > 60 ? '#10b981' :
            soc > 30 ? '#f59e0b' :
            '#ef4444'
          }
          opacity="0.8"
        >
          {charging && (
            <animate
              attributeName="opacity"
              values="0.8;0.5;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </rect>
        
        {/* SoC text */}
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size === 'lg' ? 24 : size === 'md' ? 18 : 14}
          fontWeight="bold"
          fill="var(--ink)"
        >
          {Math.round(soc)}%
        </text>
        
        {/* Chemistry label */}
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize="8"
          fill="var(--muted)"
        >
          {battery.chemistry.toUpperCase()}
        </text>
        
        {/* Charging indicator */}
        {charging && (
          <g transform={`translate(${width - 15}, 15)`}>
            <circle r="6" fill="#10b981" opacity="0.9">
              <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text x="0" y="3" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
              ⚡
            </text>
          </g>
        )}
      </svg>
      
      {/* Capacity label */}
      <div className="text-center mt-2">
        <div className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
          {battery.ratedAh}Ah
        </div>
        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
          {(battery.nominalV * battery.ratedAh / 1000).toFixed(2)} kWh
        </div>
      </div>
    </div>
  );
}
