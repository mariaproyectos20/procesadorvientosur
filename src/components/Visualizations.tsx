import { useMemo } from 'react';

interface SpectrumAnalyzerProps {
  data: Uint8Array;
  height?: number;
}

export function SpectrumAnalyzer({ data, height = 140 }: SpectrumAnalyzerProps) {
  const bars = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      result.push(data[i] / 255);
    }
    return result;
  }, [data]);

  return (
    <div className="relative bg-[#0a0c10] rounded-lg border border-[#2a3038] overflow-hidden" style={{ height }}>
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-full border-t border-[#1a1e24]" />
        ))}
      </div>
      {/* Frequency labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pb-1 text-[8px] font-mono text-[#353c46] pointer-events-none">
        <span>20</span>
        <span>100</span>
        <span>500</span>
        <span>1k</span>
        <span>5k</span>
        <span>10k</span>
        <span>15k</span>
      </div>
      <div className="absolute top-0 left-0 right-0 flex items-end gap-[1px] px-1" style={{ height: height - 16 }}>
        {bars.map((v, i) => {
          const hue = 180 - (i / bars.length) * 120;
          const h = v * (height - 20);
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-75"
              style={{
                height: Math.max(1, h),
                background: `linear-gradient(180deg, hsl(${hue}, 90%, 60%) 0%, hsl(${hue}, 80%, 40%) 100%)`,
                opacity: v > 0.01 ? 1 : 0.2,
                boxShadow: v > 0.5 ? `0 0 4px hsl(${hue}, 90%, 50%)` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface WaveformDisplayProps {
  data: number[];
  height?: number;
  color?: string;
}

export function WaveformDisplay({ data, height = 80, color = '#22d3ee' }: WaveformDisplayProps) {
  const points = useMemo(() => {
    if (data.length === 0) return '';
    const w = 100;
    const step = w / data.length;
    return data
      .map((v, i) => {
        const x = i * step;
        const y = v * height;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [data, height]);

  return (
    <div className="relative bg-[#0a0c10] rounded-lg border border-[#2a3038] overflow-hidden" style={{ height }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full border-t border-dashed border-[#1a1e24]" />
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <path d={points} fill="none" stroke={color} strokeWidth="0.8" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 2px ${color}88)` }} />
      </svg>
      <div className="absolute top-1 left-2 text-[8px] font-mono text-[#353c46]">FORMA DE ONDA</div>
    </div>
  );
}

interface MPXScopeProps {
  waveform: number[];
  pilotActive: boolean;
  height?: number;
}

export function MPXScope({ waveform, pilotActive, height = 120 }: MPXScopeProps) {
  // Simulate MPX composite signal with pilot tone overlay
  const mpxData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 300; i++) {
      const t = (i / 300) * Math.PI * 4;
      const audio = waveform.length > 0 ? waveform[Math.floor((i / 300) * waveform.length)] - 0.5 : 0;
      const pilot = pilotActive ? Math.sin(t * 19) * 0.045 : 0;
      const subcarrier = Math.sin(t * 38) * Math.abs(audio) * 0.3;
      const y = 50 + (audio * 30 + pilot * 100 + subcarrier * 100);
      pts.push({ x: (i / 300) * 100, y: Math.max(5, Math.min(95, y)) });
    }
    return pts;
  }, [waveform, pilotActive]);

  const path = mpxData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  return (
    <div className="relative bg-[#0a0c10] rounded-lg border border-[#2a3038] overflow-hidden" style={{ height }}>
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="border border-[#121519]" />
        ))}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <path d={path} fill="none" stroke="#10b981" strokeWidth="0.6" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 2px #10b98188)' }} />
      </svg>
      <div className="absolute top-1 left-2 text-[8px] font-mono text-[#353c46]">OSCILOSCPIO MPX</div>
      <div className="absolute top-1 right-2 flex items-center gap-1">
        <span className={`led ${pilotActive ? 'led-green' : 'led-off'}`} />
        <span className="text-[8px] font-mono text-[#5d6570]">PILOTO 19kHz</span>
      </div>
    </div>
  );
}

interface ModulationMeterProps {
  deviation: number; // 0-100%
  height?: number;
}

export function ModulationMeter({ deviation, height = 16 }: ModulationMeterProps) {
  const segments = 50;
  const activeSegs = Math.round((deviation / 100) * segments);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-[#5d6570] uppercase tracking-wider">Modulación MPX</span>
        <span
          className="font-mono text-xs font-bold"
          style={{ color: deviation > 90 ? '#ef4444' : deviation > 75 ? '#f59e0b' : '#10b981' }}
        >
          {deviation.toFixed(1)}%
        </span>
      </div>
      <div className="flex gap-[1px] bg-[#0a0c10] rounded p-1 border border-[#2a3038]" style={{ height: height + 4 }}>
        {Array.from({ length: segments }).map((_, i) => {
          const active = i < activeSegs;
          let color = '#22c55e';
          if (i / segments > 0.75) color = '#f59e0b';
          if (i / segments > 0.9) color = '#ef4444';
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-75"
              style={{
                background: active ? color : '#16191e',
                boxShadow: active ? `0 0 3px ${color}66` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
