import { useCallback, useRef, type ReactNode } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  size?: number;
  onChange: (value: number) => void;
  color?: string;
  formatValue?: (v: number) => string;
}

export function Knob({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = '',
  size = 56,
  onChange,
  color = '#22d3ee',
  formatValue,
}: KnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);

  const range = max - min;
  const normalized = (value - min) / range;
  const angle = -135 + normalized * 270;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startValue: value };

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        const sensitivity = ev.shiftKey ? 0.3 : 1;
        const newNorm = Math.max(0, Math.min(1, (delta * sensitivity) / 200 + (dragRef.current.startValue - min) / range));
        let newVal = min + newNorm * range;
        newVal = Math.round(newVal / step) * step;
        onChange(newVal);
      };

      const handleUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [value, min, range, step, onChange]
  );

  const handleDoubleClick = useCallback(() => {
    const defaultVal = min + range / 2;
    onChange(Math.round(defaultVal / step) * step);
  }, [min, range, step, onChange]);

  const displayValue = formatValue ? formatValue(value) : `${value.toFixed(step < 1 ? 1 : 0)}${unit}`;
  const radius = size / 2;
  const indicatorLength = radius * 0.6;

  const indicatorX = radius + indicatorLength * Math.cos((angle - 90) * (Math.PI / 180));
  const indicatorY = radius + indicatorLength * Math.sin((angle - 90) * (Math.PI / 180));

  const arcRadius = radius - 4;
  const arcStart = -135;
  const arcEnd = angle;

  const arcPath = describeArc(radius, radius, arcRadius, arcStart, arcEnd);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg
        width={size}
        height={size}
        className="cursor-ns-resize touch-none"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      >
        <circle cx={radius} cy={radius} r={arcRadius} fill="none" stroke="#20252d" strokeWidth="3" />
        {normalized > 0.01 && <path d={arcPath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />}
        <circle cx={radius} cy={radius} r={radius - 8} fill="#1a1e24" stroke="#2a3038" strokeWidth="1" />
        <line
          x1={radius}
          y1={radius}
          x2={indicatorX}
          y2={indicatorY}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={radius} cy={radius} r="3" fill={color} />
      </svg>
      <div className="font-mono text-[10px] font-bold" style={{ color }}>
        {displayValue}
      </div>
      <div className="text-[10px] text-[#5d6570] uppercase tracking-wider text-center leading-tight max-w-[70px]">{label}</div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

interface PanelProps {
  title: string;
  icon?: ReactNode;
  enabled?: boolean;
  onToggle?: () => void;
  children: ReactNode;
  className?: string;
  accentColor?: string;
  led?: 'on' | 'off' | 'green' | 'red' | 'amber';
}

export function Panel({ title, icon, enabled, onToggle, children, className = '', accentColor = '#22d3ee', led }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {led && <span className={`led ${led === 'on' ? 'led-on' : led === 'green' ? 'led-green' : led === 'red' ? 'led-red' : led === 'amber' ? 'led-amber' : 'led-off'}`} />}
          {icon && <span style={{ color: enabled === false ? '#5d6570' : accentColor }}>{icon}</span>}
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: enabled === false ? '#5d6570' : '#e8ecf1' }}>
            {title}
          </h3>
        </div>
        {onToggle && (
          <Toggle checked={enabled ?? false} onChange={onToggle} color={accentColor} />
        )}
      </div>
      <div className={`p-3 ${enabled === false ? 'opacity-40 pointer-events-none' : ''}`}>{children}</div>
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  color?: string;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, color = '#22d3ee', size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 28 : 36;
  const h = size === 'sm' ? 16 : 20;
  const knobSize = size === 'sm' ? 10 : 14;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="relative rounded-full transition-colors duration-200 flex-shrink-0"
      style={{
        width: w,
        height: h,
        background: checked ? color : '#20252d',
        boxShadow: checked ? `0 0 8px ${color}66` : 'inset 0 1px 2px rgba(0,0,0,0.3)',
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200"
        style={{ width: knobSize, height: knobSize, left: checked ? w - knobSize - 3 : 3 }}
      />
    </button>
  );
}

interface FaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  color?: string;
}

export function Fader({ label, value, min, max, step = 0.1, unit = '', onChange, color = '#22d3ee' }: FaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-[#5d6570] uppercase tracking-wider">{label}</span>
        <span className="font-mono text-[10px] font-bold" style={{ color }}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-fancy w-full"
      />
    </div>
  );
}

interface SegmentedControlProps {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (v: string | number) => void;
  color?: string;
}

export function SegmentedControl({ options, value, onChange, color = '#22d3ee' }: SegmentedControlProps) {
  return (
    <div className="flex bg-[#0a0c10] rounded-lg p-0.5 border border-[#2a3038]">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className="flex-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all"
          style={{
            background: value === opt.value ? color : 'transparent',
            color: value === opt.value ? '#0a0c10' : '#5d6570',
            boxShadow: value === opt.value ? `0 0 6px ${color}55` : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface VUMeterProps {
  level: number; // dB
  label?: string;
  height?: number;
  showScale?: boolean;
  color?: string;
}

export function VUMeter({ level, label, height = 120, showScale = true }: VUMeterProps) {
  const minDb = -60;
  const maxDb = 0;
  const normalized = Math.max(0, Math.min(1, (level - minDb) / (maxDb - minDb)));

  const segments = 30;
  const segmentData: { active: boolean; color: string }[] = [];
  for (let i = 0; i < segments; i++) {
    const segNorm = i / segments;
    const active = segNorm <= normalized;
    let color = '#22c55e';
    if (segNorm > 0.75) color = '#f59e0b';
    if (segNorm > 0.9) color = '#ef4444';
    segmentData.push({ active, color });
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[9px] text-[#5d6570] uppercase tracking-wider text-center">{label}</span>}
      <div className="flex gap-2">
        <div className="flex flex-col-reverse gap-[1px]" style={{ height }}>
          {segmentData.map((seg, i) => (
            <div
              key={i}
              className="meter-segment rounded-sm"
              style={{
                width: 12,
                height: (height / segments) - 1,
                background: seg.active ? seg.color : '#16191e',
                opacity: seg.active ? 1 : 0.3,
                boxShadow: seg.active ? `0 0 3px ${seg.color}88` : 'none',
                transition: 'opacity 0.06s linear',
              }}
            />
          ))}
        </div>
        {showScale && (
          <div className="flex flex-col justify-between text-[8px] font-mono text-[#5d6570] py-0">
            <span>0</span>
            <span>-6</span>
            <span>-12</span>
            <span>-20</span>
            <span>-40</span>
            <span>-60</span>
          </div>
        )}
      </div>
      <div className="font-mono text-[10px] text-center" style={{ color: normalized > 0.9 ? '#ef4444' : normalized > 0.75 ? '#f59e0b' : '#22d3ee' }}>
        {level <= minDb ? '-∞' : level.toFixed(1)} dB
      </div>
    </div>
  );
}
