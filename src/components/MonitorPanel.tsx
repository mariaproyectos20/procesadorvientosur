import { Activity, Headphones, Clock } from 'lucide-react';
import { Panel, Toggle, SegmentedControl, VUMeter } from './ui';
import { SpectrumAnalyzer, WaveformDisplay, MPXScope, ModulationMeter } from './Visualizations';
import type { MonitorSettings } from '../types';
import type { AudioLevels } from '../useAudioEngine';

interface MonitorPanelProps {
  settings: MonitorSettings;
  onChange: (s: MonitorSettings) => void;
  levels: AudioLevels;
}

export function MonitorPanel({ settings, onChange, levels }: MonitorPanelProps) {
  const update = (field: keyof MonitorSettings, value: unknown) => {
    onChange({ ...settings, [field]: value });
  };

  const latencyMs = settings.latencyMode === 'ultra' ? 1.5 : settings.latencyMode === 'low' ? 5 : 20;

  return (
    <Panel title="Monitoreo y Visualización" icon={<Activity size={14} />} led="on" accentColor="#22d3ee">
      {/* Latency control */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock size={11} className="text-cyan-400" />
          <span className="text-[10px] text-[#5d6570] uppercase tracking-wider">Modo de Latencia</span>
          <span className="text-[9px] font-mono text-cyan-400 ml-auto">{latencyMs} ms</span>
        </div>
        <SegmentedControl
          options={[{ label: 'Ultra', value: 'ultra' }, { label: 'Baja', value: 'low' }, { label: 'Alta', value: 'high' }]}
          value={settings.latencyMode}
          onChange={(v) => update('latencyMode', v)}
        />
      </div>

      {/* Headphone monitor */}
      <div className="flex items-center justify-between bg-[#0a0c10] rounded-lg p-2.5 border border-[#1a1e24] mb-3">
        <div className="flex items-center gap-2">
          <Headphones size={14} className="text-cyan-400" />
          <div>
            <div className="text-[10px] text-[#9aa3af] font-medium">Monitoreo en Audífonos</div>
            <div className="text-[9px] text-[#5d6570]">Escucha directa en cabina</div>
          </div>
        </div>
        <Toggle checked={settings.headphoneMonitor} onChange={() => update('headphoneMonitor', !settings.headphoneMonitor)} color="#22d3ee" size="sm" />
      </div>

      {/* Spectrum analyzer */}
      <div className="mb-3">
        <SpectrumAnalyzer data={levels.spectrum} height={120} />
      </div>

      {/* Output meters */}
      <div className="flex justify-center gap-4 mb-3">
        <VUMeter level={levels.outputL} label="Salida L" height={100} />
        <VUMeter level={levels.outputR} label="Salida R" height={100} color="#10b981" />
      </div>

      {/* Waveform */}
      <div className="mb-3">
        <WaveformDisplay data={levels.waveformData} height={70} />
      </div>

      {/* MPX Scope */}
      <div className="mb-3">
        <MPXScope waveform={levels.waveformData} pilotActive={levels.pilotActive} height={100} />
      </div>

      {/* Modulation meter */}
      <ModulationMeter deviation={levels.mpxDeviation} />
    </Panel>
  );
}
