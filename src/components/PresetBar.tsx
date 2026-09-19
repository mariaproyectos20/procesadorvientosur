import { Sparkles, Guitar, Mic, Music, Radio, Library, Building2, Landmark, SlidersHorizontal, Save, RotateCcw, Trash2, PencilLine } from 'lucide-react';
import type { Preset, ProcessorState } from '../types';
import { presets as presetData } from '../presets';

interface PresetBarProps {
  activePresetId: string | null;
  onSelect: (preset: Preset) => void;
  onSave: () => void;
  onReset: () => void;
  onDelete?: (preset: Preset) => void;
  onRename?: (preset: Preset) => void;
  presets?: Preset[];
}

const iconMap: Record<string, typeof Sparkles> = {
  Sparkles,
  Guitar,
  Mic,
  Music,
  Radio,
  Library,
  Building2,
  Landmark,
  SlidersHorizontal,
};

export function PresetBar({ activePresetId, onSelect, onSave, onReset, onDelete, onRename, presets = [] }: PresetBarProps) {
  const allPresets = [...presetData, ...presets];
  return (
    <div className="panel">
      <div className="panel-header px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="led led-on" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Presets y Perfiles de Audio — Firma Sonora</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 transition-colors"
          >
            <Save size={10} />
            <span className="text-[9px] uppercase font-bold tracking-wider">Guardar</span>
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#20252d] border border-[#353c46] text-[#9aa3af] hover:bg-[#2a3038] transition-colors"
          >
            <RotateCcw size={10} />
            <span className="text-[9px] uppercase font-bold tracking-wider">Restablecer</span>
          </button>
        </div>
      </div>
      <div className="p-3 flex gap-2 overflow-x-auto">
        {allPresets.map((preset) => {
          const Icon = iconMap[preset.icon] ?? Sparkles;
          const isActive = activePresetId === preset.id;
          const isCustomPreset = preset.id.startsWith('custom-');
          return (
            <div
              key={preset.id}
              className={`relative flex-shrink-0 w-36 rounded-lg border transition-all ${
                isActive
                  ? 'border-cyan-400 bg-cyan-400/10 glow-cyan'
                  : 'border-[#2a3038] bg-[#0a0c10] hover:border-[#353c46] hover:bg-[#121519]'
              }`}
            >
              <button
                onClick={() => onSelect(preset)}
                className="w-full p-3 text-left"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-[#5d6570] group-hover:text-[#9aa3af]'} />
                  <span className={`text-xs font-bold ${isActive ? 'text-cyan-400' : 'text-[#9aa3af]'}`}>{preset.name}</span>
                  {isActive && <span className="led led-on ml-auto" />}
                </div>
                <p className="text-[9px] text-[#5d6570] leading-tight line-clamp-2">{preset.description}</p>
              </button>

              {isCustomPreset && (
                <div className="absolute right-2 top-2 flex gap-1">
                  {onRename && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRename(preset);
                      }}
                      className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-1 text-cyan-300 transition hover:bg-cyan-500/20"
                      aria-label={`Renombrar preset ${preset.name}`}
                      title="Renombrar preset personalizado"
                    >
                      <PencilLine size={10} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(preset);
                      }}
                      className="rounded-md border border-red-500/30 bg-red-500/10 p-1 text-red-300 transition hover:bg-red-500/20"
                      aria-label={`Eliminar preset ${preset.name}`}
                      title="Eliminar preset personalizado"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { ProcessorState };
