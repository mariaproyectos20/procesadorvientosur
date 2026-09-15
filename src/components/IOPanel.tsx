import { Plug, Network } from 'lucide-react';
import { Panel, Toggle, SegmentedControl, Fader } from './ui';
import type { IOSettings } from '../types';

interface IOPanelProps {
  settings: IOSettings;
  onChange: (s: IOSettings) => void;
}

export function IOPanel({ settings, onChange }: IOPanelProps) {
  const update = (field: keyof IOSettings, value: unknown) => {
    onChange({ ...settings, [field]: value });
  };

  const protocols: { label: string; value: string }[] = [
    { label: 'AES67', value: 'AES67' },
    { label: 'Livewire', value: 'Livewire' },
    { label: 'Dante', value: 'Dante' },
    { label: 'Ravenna', value: 'Ravenna' },
  ];

  return (
    <Panel title="Conectividad e Interfaces I/O" icon={<Plug size={14} />} led="green" accentColor="#22d3ee">
      {/* Sample Rate */}
      <div className="mb-3">
        <div className="text-[10px] text-[#5d6570] uppercase tracking-wider mb-1.5">Tasa de Muestreo</div>
        <SegmentedControl
          options={[{ label: '48 kHz', value: '48kHz' }, { label: '96 kHz', value: '96kHz' }]}
          value={settings.sampleRate}
          onChange={(v) => update('sampleRate', v)}
        />
      </div>

      {/* Analog I/O */}
      <div className="space-y-2 mb-3">
        <div className="text-[10px] text-[#5d6570] uppercase tracking-wider">I/O Analógica (XLR Balanceado, 24-bit)</div>
        <Fader label="Ganancia Entrada Analógica" value={settings.analogInputGain} min={-12} max={12} step={0.5} unit=" dB" onChange={(v) => update('analogInputGain', v)} />
        <Fader label="Ganancia Salida Analógica" value={settings.analogOutputGain} min={-12} max={12} step={0.5} unit=" dB" color="#10b981" onChange={(v) => update('analogOutputGain', v)} />
      </div>

      {/* Digital Outputs */}
      <div className="space-y-2">
        <div className="text-[10px] text-[#5d6570] uppercase tracking-wider mb-1.5">Salidas Digitales</div>

        <div className="flex items-center justify-between bg-[#0a0c10] rounded-lg p-2.5 border border-[#1a1e24]">
          <div className="flex items-center gap-2">
            <span className={`led ${settings.aesEbuOutput ? 'led-green' : 'led-off'}`} />
            <div>
              <div className="text-[10px] text-[#9aa3af] font-medium">AES/EBU (XLR)</div>
              <div className="text-[9px] text-[#5d6570]">Salida digital con SRC</div>
            </div>
          </div>
          <Toggle checked={settings.aesEbuOutput} onChange={() => update('aesEbuOutput', !settings.aesEbuOutput)} color="#10b981" size="sm" />
        </div>

        <div className="flex items-center justify-between bg-[#0a0c10] rounded-lg p-2.5 border border-[#1a1e24]">
          <div className="flex items-center gap-2">
            <span className={`led ${settings.mpxOutput1 ? 'led-on' : 'led-off'}`} />
            <div>
              <div className="text-[10px] text-[#9aa3af] font-medium">Salida MPX 1 (BNC)</div>
              <div className="text-[9px] text-[#5d6570]">Inyección directa al excitador</div>
            </div>
          </div>
          <Toggle checked={settings.mpxOutput1} onChange={() => update('mpxOutput1', !settings.mpxOutput1)} color="#22d3ee" size="sm" />
        </div>

        <div className="flex items-center justify-between bg-[#0a0c10] rounded-lg p-2.5 border border-[#1a1e24]">
          <div className="flex items-center gap-2">
            <span className={`led ${settings.mpxOutput2 ? 'led-on' : 'led-off'}`} />
            <div>
              <div className="text-[10px] text-[#9aa3af] font-medium">Salida MPX 2 (BNC)</div>
              <div className="text-[9px] text-[#5d6570]">Salida flotante secundaria</div>
            </div>
          </div>
          <Toggle checked={settings.mpxOutput2} onChange={() => update('mpxOutput2', !settings.mpxOutput2)} color="#22d3ee" size="sm" />
        </div>
      </div>

      {/* AoIP */}
      <div className="mt-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Network size={11} className="text-cyan-400" />
          <span className="text-[10px] text-[#5d6570] uppercase tracking-wider">Audio sobre IP (AoIP)</span>
        </div>
        <SegmentedControl options={protocols} value={settings.aoipProtocol} onChange={(v) => update('aoipProtocol', v)} />
      </div>
    </Panel>
  );
}
