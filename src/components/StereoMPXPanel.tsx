import { Radio } from 'lucide-react';
import { Knob, Panel, Toggle, Fader } from './ui';
import type { StereoMPXSettings } from '../types';

interface StereoMPXPanelProps {
  settings: StereoMPXSettings;
  onChange: (s: StereoMPXSettings) => void;
}

export function StereoMPXPanel({ settings, onChange }: StereoMPXPanelProps) {
  const update = (field: keyof StereoMPXSettings, value: unknown) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <Panel
      title="Generador Estéreo y Múltiplex (MPX)"
      icon={<Radio size={14} />}
      enabled={settings.stereoEnabled}
      onToggle={() => update('stereoEnabled', !settings.stereoEnabled)}
      led={settings.stereoEnabled ? 'green' : 'off'}
      accentColor="#10b981"
    >
      {/* MPX spectrum diagram */}
      <div className="relative h-20 bg-[#0a0c10] rounded-lg border border-[#2a3038] mb-3 overflow-hidden">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
          {/* L+R band */}
          <rect x="2" y="20" width="28" height="20" fill="#10b98133" stroke="#10b98166" strokeWidth="0.3" />
          <text x="16" y="44" fill="#10b981" fontSize="4" textAnchor="middle" fontFamily="monospace">L+R 0-15kHz</text>

          {/* Pilot */}
          <line x1="33" y1="10" x2="33" y2="45" stroke="#22d3ee" strokeWidth="0.8" />
          <circle cx="33" cy="25" r="2" fill="#22d3ee" opacity="0.6" />
          <text x="33" y="8" fill="#22d3ee" fontSize="3.5" textAnchor="middle" fontFamily="monospace">19k</text>

          {/* L-R subcarrier */}
          <rect x="38" y="20" width="22" height="20" fill="#a78bfa33" stroke="#a78bfa66" strokeWidth="0.3" />
          <text x="49" y="44" fill="#a78bfa" fontSize="4" textAnchor="middle" fontFamily="monospace">L-R 38kHz</text>

          {/* RDS */}
          {settings.pilotLevel > 0 && (
            <>
              <line x1="72" y1="15" x2="72" y2="40" stroke="#f59e0b" strokeWidth="0.5" />
              <text x="72" y="12" fill="#f59e0b" fontSize="3" textAnchor="middle" fontFamily="monospace">57k RDS</text>
            </>
          )}
        </svg>
        <div className="absolute top-1 left-2 text-[8px] font-mono text-[#353c46]">ESPECTRO MPX</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Knob label="Nivel Piloto" value={settings.pilotLevel} min={0} max={15} step={0.5} unit="%" color="#22d3ee" onChange={(v) => update('pilotLevel', v)} />
        <Knob label="Frec. Piloto" value={settings.pilotFrequency / 1000} min={18.9} max={19.1} step={0.001} unit=" kHz" color="#22d3ee" formatValue={(v) => `${v.toFixed(3)} kHz`} onChange={(v) => update('pilotFrequency', v * 1000)} />
        <Knob label="Separación L/R" value={settings.separation} min={30} max={70} step={1} unit=" dB" color="#10b981" onChange={(v) => update('separation', v)} />
        <Knob label="Filtro Pasa-bajo" value={settings.lowPassCutoff / 1000} min={10} max={15} step={0.5} unit=" kHz" color="#a78bfa" onChange={(v) => update('lowPassCutoff', v * 1000)} />
      </div>

      <div className="mt-3 flex items-center justify-between bg-[#0a0c10] rounded-lg p-2 border border-[#1a1e24]">
        <div>
          <div className="text-[10px] text-[#9aa3af] font-medium">Filtro Pasabajo 15 kHz</div>
          <div className="text-[9px] text-[#5d6570]">Protege el piloto y evita aliasing</div>
        </div>
        <Toggle checked={settings.lowPassEnabled} onChange={() => update('lowPassEnabled', !settings.lowPassEnabled)} color="#a78bfa" size="sm" />
      </div>

      {/* Stereo separation visual */}
      <div className="mt-2 pt-2 border-t border-[#2a3038]">
        <div className="flex justify-between text-[9px] text-[#5d6570] mb-1">
          <span>Separación Estéreo</span>
          <span className={`font-mono ${settings.separation >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {settings.separation >= 50 ? 'EXCELENTE' : 'ACEPTABLE'} ({settings.separation} dB)
          </span>
        </div>
        <div className="flex gap-1">
          <div className="flex-1 h-1.5 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full" />
          <div className="flex-1 h-1.5 bg-gradient-to-l from-cyan-400 to-emerald-400 rounded-full" />
        </div>
        <div className="flex justify-between text-[8px] text-[#353c46] mt-0.5">
          <span>L</span>
          <span>R</span>
        </div>
      </div>
    </Panel>
  );
}
