import { TrendingUp, Scissors } from 'lucide-react';
import { Knob, Panel, SegmentedControl, Toggle } from './ui';
import type { PreEmphasisSettings, ClipperSettings } from '../types';

interface PreEmphasisHFPanelProps {
  settings: PreEmphasisSettings;
  onChange: (s: PreEmphasisSettings) => void;
}

export function PreEmphasisHFPanel({ settings, onChange }: PreEmphasisHFPanelProps) {
  const update = (field: keyof PreEmphasisSettings, value: unknown) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <Panel
      title="Pre-énfasis y Control HF"
      icon={<TrendingUp size={14} />}
      enabled={settings.enabled}
      onToggle={() => update('enabled', !settings.enabled)}
      led={settings.enabled ? 'on' : 'off'}
      accentColor="#f59e0b"
    >
      <div className="mb-3">
        <div className="text-[10px] text-[#5d6570] uppercase tracking-wider mb-1.5">Norma de Pre-énfasis</div>
        <SegmentedControl
          options={[{ label: '50 µs (EU/LATAM)', value: '50us' }, { label: '75 µs (USA)', value: '75us' }]}
          value={settings.standard}
          onChange={(v) => update('standard', v)}
          color="#f59e0b"
        />
      </div>

      {/* Pre-emphasis curve visualization */}
      <div className="relative h-16 bg-[#0a0c10] rounded-lg border border-[#2a3038] mb-3 overflow-hidden">
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full">
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1a1e24" strokeWidth="0.5" />
          <line x1="0" y1="0" x2="0" y2="60" stroke="#1a1e24" strokeWidth="0.5" />
          <path
            d={settings.enabled ? (settings.standard === '50us' ? 'M 0 50 Q 30 48 50 40 Q 70 30 100 15' : 'M 0 50 Q 25 46 50 35 Q 75 22 100 8') : 'M 0 50 L 100 50'}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
            style={{ filter: 'drop-shadow(0 0 2px #f59e0b66)' }}
          />
        </svg>
        <div className="absolute top-1 left-2 text-[8px] font-mono text-[#353c46]">CURVA PRE-ÉNFASIS</div>
        <div className="absolute bottom-1 left-2 text-[8px] font-mono text-[#353c46]">20Hz</div>
        <div className="absolute bottom-1 right-2 text-[8px] font-mono text-[#353c46]">15kHz</div>
      </div>

      <div className="flex items-center justify-between bg-[#0a0c10] rounded-lg p-2 border border-[#1a1e24]">
        <div>
          <div className="text-[10px] text-[#9aa3af] font-medium">Limitador de HF</div>
          <div className="text-[9px] text-[#5d6570]">Evita sobremodulación por agudos</div>
        </div>
        <Toggle checked={settings.hfLimitEnabled} onChange={() => update('hfLimitEnabled', !settings.hfLimitEnabled)} color="#f59e0b" size="sm" />
      </div>

      {settings.hfLimitEnabled && (
        <div className="mt-3 flex justify-center">
          <Knob label="Umbral Límite HF" value={settings.hfLimitThreshold} min={-12} max={0} step={0.5} unit=" dB" color="#f59e0b" onChange={(v) => update('hfLimitThreshold', v)} />
        </div>
      )}
    </Panel>
  );
}

interface ClipperPanelProps {
  settings: ClipperSettings;
  onChange: (s: ClipperSettings) => void;
}

export function ClipperPanel({ settings, onChange }: ClipperPanelProps) {
  const update = (field: keyof ClipperSettings, value: unknown) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <Panel
      title="Limitador de Picos (Clipper)"
      icon={<Scissors size={14} />}
      enabled={settings.enabled}
      onToggle={() => update('enabled', !settings.enabled)}
      led={settings.enabled ? 'red' : 'off'}
      accentColor="#ef4444"
    >
      <div className="grid grid-cols-2 gap-2 justify-items-center">
        <Knob label="Techo" value={settings.ceiling} min={-6} max={0} step={0.1} unit=" dB" color="#ef4444" onChange={(v) => update('ceiling', v)} />
      </div>

      {/* Clipping visualization */}
      <div className="mt-3 relative h-20 bg-[#0a0c10] rounded-lg border border-[#2a3038] overflow-hidden">
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full">
          <line x1="0" y1="30" x2="100" y2="30" stroke="#1a1e24" strokeWidth="0.5" strokeDasharray="2 2" />
          {settings.enabled && (
            <>
              <line x1="0" y1={30 - (settings.ceiling + 6) * 4} x2="100" y2={30 - (settings.ceiling + 6) * 4} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="0" y1={30 + (settings.ceiling + 6) * 4} x2="100" y2={30 + (settings.ceiling + 6) * 4} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 2" />
            </>
          )}
          <path
            d={settings.enabled
              ? 'M 0 30 Q 10 5 20 30 Q 30 55 40 30 Q 50 5 60 30 Q 70 55 80 30 Q 90 5 100 30'
              : 'M 0 30 Q 10 2 20 30 Q 30 58 40 30 Q 50 2 60 30 Q 70 58 80 30 Q 90 2 100 30'}
            fill="none"
            stroke={settings.enabled ? '#ef4444' : '#22d3ee'}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 2px ${settings.enabled ? '#ef444488' : '#22d3ee88'})` }}
          />
        </svg>
        <div className="absolute top-1 left-2 text-[8px] font-mono text-[#353c46]">RECORTE</div>
      </div>

      <div className="mt-3 flex items-center justify-between bg-[#0a0c10] rounded-lg p-2 border border-[#1a1e24]">
        <div>
          <div className="text-[10px] text-[#9aa3af] font-medium">Compensación de Overshoot</div>
          <div className="text-[9px] text-[#5d6570]">Reduce distorsión audible inter-muestreo</div>
        </div>
        <Toggle checked={settings.overshootCompensation} onChange={() => update('overshootCompensation', !settings.overshootCompensation)} color="#ef4444" size="sm" />
      </div>
    </Panel>
  );
}
