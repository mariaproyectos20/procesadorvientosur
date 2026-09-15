import { Shield, RadioTower, Type } from 'lucide-react';
import { Panel, Toggle, Knob, SegmentedControl } from './ui';
import type { RegulatorySettings } from '../types';

interface RegulatoryPanelProps {
  settings: RegulatorySettings;
  onChange: (s: RegulatorySettings) => void;
}

export function RegulatoryPanel({ settings, onChange }: RegulatoryPanelProps) {
  const update = (field: keyof RegulatorySettings, value: unknown) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <Panel title="Normativas y Control de Modulación" icon={<Shield size={14} />} led="amber" accentColor="#f59e0b">
      {/* BS.412 */}
      <div className="bg-[#0a0c10] rounded-lg p-3 border border-[#1a1e24]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RadioTower size={14} className="text-amber-400" />
            <div>
              <div className="text-[10px] text-[#9aa3af] font-bold">Norma ITU-R BS.412</div>
              <div className="text-[9px] text-[#5d6570]">Limitador de potencia MPX obligatorio</div>
            </div>
          </div>
          <Toggle checked={settings.bs412Enabled} onChange={() => update('bs412Enabled', !settings.bs412Enabled)} color="#f59e0b" size="sm" />
        </div>

        {settings.bs412Enabled && (
          <div className="flex justify-center mt-2">
            <Knob label="Nivel Máx. Desviación" value={settings.bs412Level} min={40} max={100} step={1} unit="%" color="#f59e0b" onChange={(v) => update('bs412Level', v)} />
          </div>
        )}

        {/* Compliance indicator */}
        <div className="mt-2 pt-2 border-t border-[#1a1e24] flex justify-between items-center">
          <span className="text-[9px] text-[#5d6570]">Estado de cumplimiento</span>
          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase ${settings.bs412Enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`led ${settings.bs412Enabled ? 'led-green' : 'led-amber'}`} />
            {settings.bs412Enabled ? 'Conforme' : 'No conforme'}
          </span>
        </div>
      </div>

      {/* RDS / RBDS */}
      <div className="bg-[#0a0c10] rounded-lg p-3 border border-[#1a1e24] mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Type size={14} className="text-cyan-400" />
            <div>
              <div className="text-[10px] text-[#9aa3af] font-bold">RDS / RBDS (57 kHz)</div>
              <div className="text-[9px] text-[#5d6570]">Envío de texto a receptores</div>
            </div>
          </div>
          <Toggle checked={settings.rdsEnabled} onChange={() => update('rdsEnabled', !settings.rdsEnabled)} color="#22d3ee" size="sm" />
        </div>

        {settings.rdsEnabled && (
          <div className="space-y-2 mt-2">
            <div>
              <div className="text-[9px] text-[#5d6570] uppercase mb-1">Modo RDS</div>
              <SegmentedControl
                options={[{ label: 'Codificador Interno', value: 'internal' }, { label: 'Paso Directo', value: 'passthrough' }]}
                value={settings.rdsMode}
                onChange={(v) => update('rdsMode', v)}
              />
            </div>
            {settings.rdsMode === 'internal' && (
              <div>
                <div className="text-[9px] text-[#5d6570] uppercase mb-1">Texto RDS (PS)</div>
                <input
                  type="text"
                  maxLength={8}
                  value={settings.rdsText}
                  onChange={(e) => update('rdsText', e.target.value.toUpperCase())}
                  className="w-full bg-[#20252d] border border-[#2a3038] rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 uppercase tracking-widest focus:border-cyan-400 focus:outline-none"
                  placeholder="RADIO FM"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-[#5d6570]">Máx. 8 caracteres</span>
                  <span className="text-[8px] font-mono text-[#5d6570]">{settings.rdsText.length}/8</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
