import { Layers } from 'lucide-react';
import { Knob, Panel, SegmentedControl, Fader } from './ui';
import type { MultibandSettings, BandSettings } from '../types';
import { getBands } from '../presets';

interface MultibandPanelProps {
  settings: MultibandSettings;
  onChange: (s: MultibandSettings) => void;
}

export function MultibandPanel({ settings, onChange }: MultibandPanelProps) {
  const update = (field: keyof MultibandSettings, value: unknown) => {
    if (field === 'bandCount') {
      const count = value as 3 | 5;
      onChange({ ...settings, bandCount: count, bands: getBands(count) });
    } else {
      onChange({ ...settings, [field]: value });
    }
  };

  const updateBand = (index: number, field: keyof BandSettings, value: number | boolean) => {
    const bands = settings.bands.map((b, i) => (i === index ? { ...b, [field]: value } : b));
    onChange({ ...settings, bands });
  };

  const bandColors = ['#f97316', '#f59e0b', '#22d3ee', '#10b981', '#a78bfa'];
  const bandIcons = ['\\', '|', '/'];

  return (
    <Panel
      title="Compresión Multibanda"
      icon={<Layers size={14} />}
      enabled={settings.enabled}
      onToggle={() => update('enabled', !settings.enabled)}
      led={settings.enabled ? 'on' : 'off'}
    >
      <div className="mb-3">
        <SegmentedControl
          options={[{ label: '3 Bandas', value: '3' }, { label: '5 Bandas', value: '5' }]}
          value={String(settings.bandCount)}
          onChange={(v) => update('bandCount', parseInt(String(v)))}
        />
      </div>

      {/* Frequency band visualization */}
      <div className="flex h-8 mb-3 rounded-lg overflow-hidden border border-[#2a3038]">
        {settings.bands.map((band, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center border-r border-[#0a0c10] last:border-r-0 transition-all"
            style={{
              background: band.enabled ? `${bandColors[i % bandColors.length]}22` : '#16191e',
              borderBottom: `2px solid ${band.enabled ? bandColors[i % bandColors.length] : '#2a3038'}`,
            }}
          >
            <span className="text-[8px] font-mono" style={{ color: band.enabled ? bandColors[i % bandColors.length] : '#5d6570' }}>
              {band.freqLow < 1000 ? `${band.freqLow}` : `${(band.freqLow / 1000).toFixed(1)}k`}
              {bandIcons[i % bandIcons.length]}
            </span>
          </div>
        ))}
      </div>

      {/* Band controls */}
      <div className={`grid gap-2 ${settings.bandCount === 5 ? 'grid-cols-5' : 'grid-cols-3'}`}>
        {settings.bands.map((band, i) => (
          <div key={i} className="bg-[#0a0c10] rounded-lg p-2 border border-[#1a1e24]">
            <div className="text-[9px] font-bold uppercase mb-1 text-center" style={{ color: bandColors[i % bandColors.length] }}>
              {band.name}
            </div>
            <div className="text-[8px] font-mono text-[#5d6570] text-center mb-2">
              {band.freqLow < 1000 ? `${band.freqLow}` : `${(band.freqLow / 1000).toFixed(1)}k`}
              {' - '}
              {band.freqHigh < 1000 ? `${band.freqHigh}` : `${(band.freqHigh / 1000).toFixed(1)}k`} Hz
            </div>
            <div className="space-y-2">
              <Knob label="Umbral" value={band.threshold} min={-40} max={0} step={0.5} unit="" size={42} color={bandColors[i % bandColors.length]} onChange={(v) => updateBand(i, 'threshold', v)} />
              <Knob label="Relación" value={band.ratio} min={1} max={10} step={0.5} unit=":1" size={42} color={bandColors[i % bandColors.length]} onChange={(v) => updateBand(i, 'ratio', v)} />
              <Knob label="Ganancia" value={band.gain} min={-12} max={12} step={0.5} unit="" size={42} color={bandColors[i % bandColors.length]} onChange={(v) => updateBand(i, 'gain', v)} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-[#2a3038]">
        <Fader label="Acoplamiento" value={settings.linkage} min={0} max={100} step={1} unit="%" color="#a78bfa" onChange={(v) => update('linkage', v)} />
      </div>
    </Panel>
  );
}
