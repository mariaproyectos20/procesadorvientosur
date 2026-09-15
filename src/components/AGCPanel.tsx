import { Gauge } from 'lucide-react';
import { Knob, Panel } from './ui';
import type { AGCSettings } from '../types';

interface AGCPanelProps {
  settings: AGCSettings;
  onChange: (s: AGCSettings) => void;
}

export function AGCPanel({ settings, onChange }: AGCPanelProps) {
  const update = (field: keyof AGCSettings, value: number | boolean) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <Panel
      title="Control Automático de Ganancia"
      icon={<Gauge size={14} />}
      enabled={settings.enabled}
      onToggle={() => update('enabled', !settings.enabled)}
      led={settings.enabled ? 'on' : 'off'}
    >
      <div className="grid grid-cols-3 gap-2 justify-items-center">
        <Knob label="Objetivo" value={settings.targetLevel} min={-20} max={0} step={0.5} unit=" dB" onChange={(v) => update('targetLevel', v)} />
        <Knob label="Umbral" value={settings.threshold} min={-40} max={0} step={0.5} unit=" dB" color="#f59e0b" onChange={(v) => update('threshold', v)} />
        <Knob label="Relación" value={settings.ratio} min={1} max={20} step={0.5} unit=":1" color="#10b981" onChange={(v) => update('ratio', v)} />
        <Knob label="Ataque" value={settings.attack} min={1} max={50} step={1} unit=" ms" color="#a78bfa" onChange={(v) => update('attack', v)} />
        <Knob label="Liberación" value={settings.release} min={50} max={500} step={10} unit=" ms" color="#a78bfa" onChange={(v) => update('release', v)} />
        <Knob label="Ganancia" value={settings.makeupGain} min={0} max={18} step={0.5} unit=" dB" color="#22d3ee" onChange={(v) => update('makeupGain', v)} />
      </div>
      <div className="mt-3 pt-2 border-t border-[#2a3038]">
        <div className="flex justify-between text-[10px] text-[#5d6570] mb-1">
          <span>Reducción de Ganancia</span>
          <span className="font-mono text-cyan-400">{(Math.abs(settings.threshold - settings.targetLevel) * (settings.ratio / (settings.ratio + 1))).toFixed(1)} dB</span>
        </div>
        <div className="h-1.5 bg-[#0a0c10] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(100, (settings.ratio / 20) * 100)}%` }} />
        </div>
      </div>
    </Panel>
  );
}
