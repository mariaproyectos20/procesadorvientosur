import { Radio, Wifi, Cpu, Signal } from 'lucide-react';
import type { ProcessorState, AudioSourceType } from '../types';
import type { AudioLevels } from '../useAudioEngine';

interface HeaderProps {
  state: ProcessorState;
  levels: AudioLevels;
  sourceType: AudioSourceType;
}

export function Header({ state, levels, sourceType }: HeaderProps) {
  const sr = state.io.sampleRate === '96kHz' ? 96000 : 48000;
  const activeOutputs = [state.io.aesEbuOutput, state.io.mpxOutput1, state.io.mpxOutput2].filter(Boolean).length;
  const aoipActive = state.io.aoipProtocol !== 'Off';

  return (
    <header className="panel px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
      {/* Logo / Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center glow-cyan">
            <Radio size={20} className="text-[#0a0c10]" />
          </div>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">VIENTO SUR <span className="text-cyan-400">FM</span></h1>
          <p className="text-[9px] text-[#5d6570] uppercase tracking-widest">Procesador de Audio Digital — Radio FM</p>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Sample rate */}
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-[#5d6570]" />
          <span className="text-[9px] text-[#5d6570] uppercase">Muestreo</span>
          <span className="font-mono text-[10px] text-cyan-400 font-bold">{(sr / 1000).toFixed(0)}k</span>
        </div>

        {/* Source */}
        <div className="flex items-center gap-1.5">
          <Signal size={12} className={levels.isPlaying ? 'text-emerald-400' : 'text-[#5d6570]'} />
          <span className="text-[9px] text-[#5d6570] uppercase">Fuente</span>
          <span className="font-mono text-[10px] font-bold" style={{ color: levels.isPlaying ? '#10b981' : '#5d6570' }}>
            {levels.isPlaying ? sourceType === 'mic' ? 'LINE IN' : sourceType.toUpperCase() : 'INACTIVO'}
          </span>
        </div>

        {/* AoIP */}
        <div className="flex items-center gap-1.5">
          <Wifi size={12} className={aoipActive ? 'text-cyan-400' : 'text-[#5d6570]'} />
          <span className="text-[9px] text-[#5d6570] uppercase">AoIP</span>
          <span className="font-mono text-[10px] font-bold" style={{ color: aoipActive ? '#22d3ee' : '#5d6570' }}>
            {state.io.aoipProtocol}
          </span>
        </div>

        {/* Outputs */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#5d6570] uppercase">Salidas</span>
          <span className="font-mono text-[10px] text-emerald-400 font-bold">{activeOutputs}</span>
        </div>

        {/* Pilot LED */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#5d6570] uppercase">Piloto 19k</span>
          <span className={`led ${state.stereoMPX.stereoEnabled ? 'led-green animate-pulse-glow' : 'led-off'}`} />
        </div>

        {/* BS.412 */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#5d6570] uppercase">BS.412</span>
          <span className={`led ${state.regulatory.bs412Enabled ? 'led-green' : 'led-amber'}`} />
        </div>

        {/* RDS */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#5d6570] uppercase">RDS</span>
          <span className={`led ${state.regulatory.rdsEnabled ? 'led-on' : 'led-off'}`} />
        </div>

        {/* MPX Deviation */}
        <div className="flex items-center gap-1.5 bg-[#0a0c10] px-2.5 py-1 rounded-lg border border-[#2a3038]">
          <span className="text-[9px] text-[#5d6570] uppercase">MPX</span>
          <span
            className="font-mono text-xs font-bold"
            style={{ color: levels.mpxDeviation > 90 ? '#ef4444' : levels.mpxDeviation > 75 ? '#f59e0b' : '#10b981' }}
          >
            {levels.mpxDeviation.toFixed(0)}%
          </span>
        </div>
      </div>
    </header>
  );
}
