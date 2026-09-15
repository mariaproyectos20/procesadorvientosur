import { useState, useCallback, useEffect, useRef } from 'react';
import { Settings2, Sliders, Waves, Cable, ShieldCheck, Activity } from 'lucide-react';
import type { ProcessorState, AudioSourceType, Preset } from './types';
import { defaultState } from './presets';
import { useAudioEngine } from './useAudioEngine';
import { Header } from './components/Header';
import { PresetBar } from './components/PresetBar';
import { AudioSource } from './components/AudioSource';
import { AGCPanel } from './components/AGCPanel';
import { MultibandPanel } from './components/MultibandPanel';
import { PreEmphasisHFPanel, ClipperPanel } from './components/PreEmphasisClipperPanel';
import { StereoMPXPanel } from './components/StereoMPXPanel';
import { IOPanel } from './components/IOPanel';
import { RegulatoryPanel } from './components/RegulatoryPanel';
import { MonitorPanel } from './components/MonitorPanel';

type Tab = 'processing' | 'mpx' | 'io' | 'regulatory' | 'monitor';

const tabs: { id: Tab; label: string; icon: typeof Sliders }[] = [
  { id: 'processing', label: 'Procesamiento', icon: Sliders },
  { id: 'mpx', label: 'Estéreo & MPX', icon: Waves },
  { id: 'io', label: 'I/O & Conectividad', icon: Cable },
  { id: 'regulatory', label: 'Normativas', icon: ShieldCheck },
  { id: 'monitor', label: 'Monitoreo', icon: Activity },
];

function App() {
  const [state, setState] = useState<ProcessorState>(defaultState);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('processing');
  const [sourceType, setSourceType] = useState<AudioSourceType>('none');
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [sourceFullscreen, setSourceFullscreen] = useState(false);
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState('');

  const { levels, padPlayback, libraryPlayback, audioInputDevices, refreshAudioInputDevices, loadFile, pauseLibrary, resumeLibrary, seekLibrary, stopLibrary, setLibraryVolume, toggleLibraryMute, nudgeLibrary, playPad, pausePad, resumePad, seekPad, stopPad, startMic, startTone, stop, applyState, ensureContext } = useAudioEngine();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('viento-sur-fm-custom-presets');
      if (stored) setCustomPresets(JSON.parse(stored) as Preset[]);
    } catch {
      setCustomPresets([]);
    }
  }, []);

  // Apply audio engine state whenever processor state changes
  useEffect(() => {
    applyState(state);
  }, [state, applyState]);

  const updateSection = useCallback(<K extends keyof ProcessorState>(section: K, value: ProcessorState[K]) => {
    setState((prev) => ({ ...prev, [section]: value }));
    setActivePresetId(null);
  }, []);

  const handlePreset = useCallback((preset: Preset) => {
    setState(preset.state);
    setActivePresetId(preset.id);
    applyState(preset.state);
  }, [applyState]);

  const handleReset = useCallback(() => {
    setState(defaultState);
    setActivePresetId(null);
    applyState(defaultState);
  }, [applyState]);

  const handleSave = useCallback(() => {
    try {
      const name = window.prompt('Nombre del preset personalizado:', `Mi preset ${customPresets.length + 1}`)?.trim();
      if (!name) return;
      const preset: Preset = {
        id: `custom-${Date.now()}`,
        name,
        description: 'Configuración personalizada de VIENTO SUR FM.',
        icon: 'SlidersHorizontal',
        state: JSON.parse(JSON.stringify(state)) as ProcessorState,
      };
      const nextPresets = [...customPresets, preset];
      localStorage.setItem('viento-sur-fm-custom-presets', JSON.stringify(nextPresets));
      setCustomPresets(nextPresets);
      setActivePresetId(preset.id);
    } catch {
      // ignore
    }
  }, [state, customPresets]);

  const handleStartMic = useCallback((s: ProcessorState) => {
    setSourceType('mic');
    setFileName(undefined);
    startMic(s, selectedInputDeviceId || undefined);
  }, [selectedInputDeviceId, startMic]);

  const handleStartTone = useCallback((s: ProcessorState) => {
    setSourceType('tone');
    setFileName(undefined);
    startTone(s);
  }, [startTone]);

  const handlePlayPad = useCallback((file: File, panelIndex: number) => {
    setSourceType('pad');
    setFileName(file.name);
    playPad(file, stateRef.current, panelIndex);
  }, [playPad]);

  const handleStop = useCallback(() => {
    stop();
    setSourceType('none');
    setFileName(undefined);
  }, [stop]);

  const handleTabClick = useCallback((t: Tab) => {
    ensureContext();
    setActiveTab(t);
  }, [ensureContext]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e8ecf1]">
      <div className="max-w-[1400px] mx-auto p-3 space-y-3">
        {/* Header */}
        <Header state={state} levels={levels} sourceType={sourceType} />

        {/* Audio Source */}
        <AudioSource
          sourceType={sourceType}
          onSourceTypeChange={() => {}}
          onStartMic={handleStartMic}
          audioInputDevices={audioInputDevices}
          selectedInputDeviceId={selectedInputDeviceId}
          onSelectedInputDeviceChange={setSelectedInputDeviceId}
          onRefreshAudioInputDevices={() => { void refreshAudioInputDevices(); }}
          onStartTone={handleStartTone}
          onPlayPad={handlePlayPad}
          onPlayLibrary={(file) => {
            setSourceType('file');
            setFileName(file.name);
            loadFile(file, stateRef.current);
          }}
          onPauseLibrary={pauseLibrary}
          onResumeLibrary={resumeLibrary}
          onSeekLibrary={seekLibrary}
          onStopLibrary={stopLibrary}
          onSetLibraryVolume={setLibraryVolume}
          onToggleLibraryMute={toggleLibraryMute}
          onNudgeLibrary={nudgeLibrary}
          libraryPlayback={libraryPlayback}
          onPausePad={pausePad}
          onResumePad={resumePad}
          onSeekPad={seekPad}
          onStopPad={stopPad}
          onStop={handleStop}
          isPlaying={levels.isPlaying}
          state={state}
          levels={levels}
          fileName={fileName}
          padPlayback={padPlayback}
            isFullscreen={sourceFullscreen}
            onToggleFullscreen={() => setSourceFullscreen((fullscreen) => !fullscreen)}
        />

        {/* Preset bar */}
        <PresetBar presets={[...customPresets]} activePresetId={activePresetId} onSelect={handlePreset} onSave={handleSave} onReset={handleReset} />

        {/* Tab navigation */}
        <div className="panel overflow-hidden">
          <div className="flex overflow-x-auto overscroll-x-contain touch-pan-x">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    isActive ? 'text-cyan-400 border-cyan-400 bg-[#121519]' : 'text-[#5d6570] border-transparent hover:text-[#9aa3af] hover:bg-[#121519]/50'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'processing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AGCPanel settings={state.agc} onChange={(s) => updateSection('agc', s)} />
            <MultibandPanel settings={state.multiband} onChange={(s) => updateSection('multiband', s)} />
            <PreEmphasisHFPanel settings={state.preEmphasis} onChange={(s) => updateSection('preEmphasis', s)} />
            <ClipperPanel settings={state.clipper} onChange={(s) => updateSection('clipper', s)} />
          </div>
        )}

        {activeTab === 'mpx' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <StereoMPXPanel settings={state.stereoMPX} onChange={(s) => updateSection('stereoMPX', s)} />
            </div>
            <MonitorPanel settings={state.monitor} onChange={(s) => updateSection('monitor', s)} levels={levels} />
          </div>
        )}

        {activeTab === 'io' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <IOPanel settings={state.io} onChange={(s) => updateSection('io', s)} />
            <div className="space-y-3">
              <div className="panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cable size={14} className="text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Diagrama de Señal</h3>
                </div>
                <div className="space-y-1.5 text-[10px] font-mono">
                  {[
                    { label: 'Entrada XLR', active: true, color: '#22d3ee' },
                    { label: 'ADC 24-bit', active: true, color: '#22d3ee' },
                    { label: 'AGC', active: state.agc.enabled, color: '#22d3ee' },
                    { label: 'Compresor Multibanda', active: state.multiband.enabled, color: '#10b981' },
                    { label: 'Pre-énfasis', active: state.preEmphasis.enabled, color: '#f59e0b' },
                    { label: 'Limitador HF', active: state.preEmphasis.hfLimitEnabled, color: '#f59e0b' },
                    { label: 'Clipper', active: state.clipper.enabled, color: '#ef4444' },
                    { label: 'Generador MPX', active: state.stereoMPX.stereoEnabled, color: '#10b981' },
                    { label: 'Limitador BS.412', active: state.regulatory.bs412Enabled, color: '#f59e0b' },
                    { label: 'DAC 24-bit', active: true, color: '#22d3ee' },
                    { label: 'Salida XLR / BNC', active: true, color: '#22d3ee' },
                  ].map((stage, i, arr) => (
                    <div key={stage.label} className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-all flex-1"
                        style={{
                          borderColor: stage.active ? `${stage.color}44` : '#2a3038',
                          background: stage.active ? `${stage.color}11` : '#0a0c10',
                        }}
                      >
                        <span className={`led ${stage.active ? 'led-on' : 'led-off'}`} style={stage.active ? { background: stage.color, boxShadow: `0 0 6px ${stage.color}` } : {}} />
                        <span style={{ color: stage.active ? stage.color : '#5d6570' }}>{stage.label}</span>
                      </div>
                      {i < arr.length - 1 && <span className="text-[#353c46]">↓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regulatory' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <RegulatoryPanel settings={state.regulatory} onChange={(s) => updateSection('regulatory', s)} />
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={14} className="text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Resumen de Cumplimiento</h3>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'ITU-R BS.412', status: state.regulatory.bs412Enabled, detail: state.regulatory.bs412Enabled ? `Límite: ${state.regulatory.bs412Level}%` : 'Desactivado' },
                  { name: 'Piloto 19 kHz ±1 Hz', status: state.stereoMPX.stereoEnabled, detail: state.stereoMPX.stereoEnabled ? `${state.stereoMPX.pilotFrequency.toFixed(0)} Hz` : 'Desactivado' },
                  { name: 'Separación L/R ≥50 dB', status: state.stereoMPX.separation >= 50, detail: `${state.stereoMPX.separation} dB` },
                  { name: 'Filtro LP 15 kHz', status: state.stereoMPX.lowPassEnabled, detail: state.stereoMPX.lowPassEnabled ? `${(state.stereoMPX.lowPassCutoff / 1000).toFixed(0)} kHz` : 'Desactivado' },
                  { name: 'Pre-énfasis', status: state.preEmphasis.enabled, detail: state.preEmphasis.enabled ? state.preEmphasis.standard === '50us' ? '50 µs' : '75 µs' : 'Desactivado' },
                  { name: 'RDS/RBDS', status: state.regulatory.rdsEnabled, detail: state.regulatory.rdsEnabled ? state.regulatory.rdsText || 'Sin texto' : 'Desactivado' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between bg-[#0a0c10] rounded-lg p-2.5 border border-[#1a1e24]">
                    <div className="flex items-center gap-2">
                      <span className={`led ${item.status ? 'led-green' : 'led-off'}`} />
                      <span className="text-[10px] text-[#9aa3af] font-medium">{item.name}</span>
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: item.status ? '#10b981' : '#5d6570' }}>{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <MonitorPanel settings={state.monitor} onChange={(s) => updateSection('monitor', s)} levels={levels} />
            <div className="space-y-3">
              <AGCPanel settings={state.agc} onChange={(s) => updateSection('agc', s)} />
              <ClipperPanel settings={state.clipper} onChange={(s) => updateSection('clipper', s)} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="panel px-4 py-2 flex items-center justify-between text-[9px] text-[#5d6570]">
          <div className="flex items-center gap-3">
            <span>VIENTO SUR FM v1.0</span>
            <span>·</span>
            <span>Motor de Audio Web API</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Settings2 size={10} />
              Control Remoto Web/IP
            </span>
            <span>·</span>
            <span>Compatible SNMP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
