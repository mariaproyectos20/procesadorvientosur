import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Mic, Radio, Square, Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Volume2, VolumeX, Repeat, Shuffle, FileAudio, Music2, AudioLines, Maximize2, Minimize2, Library, RefreshCw, ListPlus, MoreVertical, Trash2, ArrowUp, ArrowDown, Search, Pencil, X, Disc3 } from 'lucide-react';
import type { ProcessorState, AudioSourceType } from '../types';
import type { AudioLevels, LibraryPlaybackState, PadPlaybackState } from '../useAudioEngine';
import { deletePad, loadStoredPads, savePad } from '../padStorage';
import { deleteMusicPlaylist, deleteMusicTrack, loadMusicPlaylists, loadMusicTracks, saveMusicPlaylist, saveMusicTrack, syncPhoneMusicFolder, type MusicPlaylist, type MusicTrack } from '../musicLibrary';

interface AudioSourceProps {
  sourceType: AudioSourceType;
  onSourceTypeChange: (t: AudioSourceType) => void;
  onStartMic: (state: ProcessorState) => void;
  onStartTone: (state: ProcessorState) => void;
  onPlayPad: (file: File, panelIndex: number) => void;
  onPlayLibrary: (file: File) => void;
  onPauseLibrary: () => void;
  onResumeLibrary: () => void;
  onSeekLibrary: (time: number) => void;
  onStopLibrary: () => void;
  onSetLibraryVolume: (volume: number) => void;
  onToggleLibraryMute: () => void;
  onNudgeLibrary: (seconds: number) => void;
  libraryPlayback: LibraryPlaybackState;
  onPausePad: (panelIndex: number) => void;
  onResumePad: (panelIndex: number) => void;
  onSeekPad: (panelIndex: number, time: number) => void;
  onStopPad: (panelIndex: number) => void;
  onStop: () => void;
  isPlaying: boolean;
  state: ProcessorState;
  levels: AudioLevels;
  fileName?: string;
  padPlayback: PadPlaybackState[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function AudioSource({
  sourceType,
  onStartMic,
  onStartTone,
  onPlayPad,
  onPlayLibrary,
  onPauseLibrary,
  onResumeLibrary,
  onSeekLibrary,
  onStopLibrary,
  onSetLibraryVolume,
  onToggleLibraryMute,
  onNudgeLibrary,
  libraryPlayback,
  onPausePad,
  onResumePad,
  onSeekPad,
  onStopPad,
  onStop,
  isPlaying,
  state,
  levels,
  fileName,
  padPlayback,
  isFullscreen,
  onToggleFullscreen,
}: AudioSourceProps) {
  const padInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressPadClickRef = useRef(false);
  const [pads, setPads] = useState<Array<Array<File | null>>>(() => [
    Array.from({ length: 15 }, () => null),
    Array.from({ length: 15 }, () => null),
  ]);
  const [openPadMenu, setOpenPadMenu] = useState<string | null>(null);
  const [showPads, setShowPads] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activePanel, setActivePanel] = useState(0);
  const [musicSearch, setMusicSearch] = useState('');
  const [repeatLibrary, setRepeatLibrary] = useState(false);
  const [shuffleLibrary, setShuffleLibrary] = useState(false);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [musicPlaylists, setMusicPlaylists] = useState<MusicPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [openTrackMenu, setOpenTrackMenu] = useState<string | null>(null);
  const [openPlaylistMenu, setOpenPlaylistMenu] = useState<string | null>(null);
  const [playlistMenuPosition, setPlaylistMenuPosition] = useState({ top: 0, left: 0 });
  const [trackPressTimer, setTrackPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStoredPads().then(setPads);
    Promise.all([loadMusicTracks(), loadMusicPlaylists()]).then(([tracks, playlists]) => {
      setMusicTracks(tracks);
      setMusicPlaylists(playlists);
    }).catch(() => undefined);
  }, []);

  const formatTime = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  const padColors = [
    { accent: '#ff3b81', soft: 'rgba(255, 59, 129, 0.16)' },
    { accent: '#ff7a3d', soft: 'rgba(255, 122, 61, 0.16)' },
    { accent: '#ffc233', soft: 'rgba(255, 194, 51, 0.16)' },
    { accent: '#b8e84b', soft: 'rgba(184, 232, 75, 0.16)' },
    { accent: '#37dc8a', soft: 'rgba(55, 220, 138, 0.16)' },
    { accent: '#25d8d0', soft: 'rgba(37, 216, 208, 0.16)' },
    { accent: '#2ca9ff', soft: 'rgba(44, 169, 255, 0.16)' },
    { accent: '#6575ff', soft: 'rgba(101, 117, 255, 0.16)' },
    { accent: '#a66cff', soft: 'rgba(166, 108, 255, 0.16)' },
    { accent: '#e85dff', soft: 'rgba(232, 93, 255, 0.16)' },
    { accent: '#ff4fbe', soft: 'rgba(255, 79, 190, 0.16)' },
    { accent: '#ff5c5c', soft: 'rgba(255, 92, 92, 0.16)' },
    { accent: '#ff9f43', soft: 'rgba(255, 159, 67, 0.16)' },
    { accent: '#d8e84b', soft: 'rgba(216, 232, 75, 0.16)' },
    { accent: '#43d9ff', soft: 'rgba(67, 217, 255, 0.16)' },
  ];

  const handlePadFile = (panelIndex: number, padIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPads((current) => current.map((panel, currentPanelIndex) => currentPanelIndex === panelIndex
        ? panel.map((pad, currentPadIndex) => currentPadIndex === padIndex ? file : pad)
        : panel));
      void savePad(panelIndex, padIndex, file);
    }
    e.target.value = '';
    setOpenPadMenu(null);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePadPointerDown = (panelIndex: number, padIndex: number) => {
    clearLongPressTimer();
    suppressPadClickRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      suppressPadClickRef.current = true;
      setOpenPadMenu(`${panelIndex}-${padIndex}`);
    }, 550);
  };

  const handlePadPointerUp = () => {
    clearLongPressTimer();
  };

  const handlePadClick = (panelIndex: number, padIndex: number) => {
    if (suppressPadClickRef.current) {
      suppressPadClickRef.current = false;
      return;
    }
    const file = pads[panelIndex][padIndex];
    if (file) {
      onPlayPad(file, panelIndex);
    } else {
      padInputRefs.current[panelIndex * 15 + padIndex]?.click();
    }
  };

  const handleMusicFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const imported = await Promise.all(files.map((file) => saveMusicTrack(file)));
    setMusicTracks((current) => {
      const next = [...current];
      imported.forEach((track) => {
        if (!next.some((item) => item.id === track.id)) next.push(track);
      });
      return next;
    });
    event.target.value = '';
  };

  const handleSyncMusicFolder = async () => {
    try {
      const imported = await syncPhoneMusicFolder();
      setMusicTracks((current) => {
        const next = [...current];
        imported.forEach((track) => {
          if (!next.some((item) => item.id === track.id)) next.push(track);
        });
        return next;
      });
    } catch {
      musicInputRef.current?.click();
    }
  };

  const handleCreatePlaylist = async () => {
    const name = window.prompt('Nombre de la lista de reproducción:')?.trim();
    if (!name) return;
    const playlist: MusicPlaylist = { id: `playlist-${Date.now()}`, name, trackIds: [] };
    await saveMusicPlaylist(playlist);
    setMusicPlaylists((current) => [...current, playlist]);
    setActivePlaylistId(playlist.id);
  };

  const addTrackToPlaylist = async (trackId: string, playlistId = activePlaylistId) => {
    if (!playlistId) return;
    const current = musicPlaylists.find((playlist) => playlist.id === playlistId);
    if (!current || current.trackIds.includes(trackId)) return;
    const playlist = { ...current, trackIds: [...current.trackIds, trackId] };
    await saveMusicPlaylist(playlist);
    setMusicPlaylists((items) => items.map((item) => item.id === playlist.id ? playlist : item));
  };

  const moveTrack = (trackId: string, direction: -1 | 1) => {
    setMusicTracks((current) => {
      const index = current.findIndex((track) => track.id === trackId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setOpenTrackMenu(null);
  };

  const removeTrack = async (trackId: string) => {
    await deleteMusicTrack(trackId);
    setMusicTracks((current) => current.filter((track) => track.id !== trackId));
    setOpenTrackMenu(null);
  };

  const removeTrackFromPlaylist = async (trackId: string) => {
    if (!activePlaylistId) return;
    const playlist = musicPlaylists.find((item) => item.id === activePlaylistId);
    if (!playlist) return;
    const updated = { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) };
    await saveMusicPlaylist(updated);
    setMusicPlaylists((items) => items.map((item) => item.id === updated.id ? updated : item));
    setOpenTrackMenu(null);
  };

  const renamePlaylist = async (playlist: MusicPlaylist) => {
    const name = window.prompt('Nuevo nombre de la lista:', playlist.name)?.trim();
    if (!name || name === playlist.name) return;
    const updated = { ...playlist, name };
    await saveMusicPlaylist(updated);
    setMusicPlaylists((items) => items.map((item) => item.id === updated.id ? updated : item));
    setOpenPlaylistMenu(null);
  };

  const removePlaylist = async (playlist: MusicPlaylist) => {
    if (!window.confirm(`¿Borrar la lista "${playlist.name}"?`)) return;
    await deleteMusicPlaylist(playlist.id);
    setMusicPlaylists((items) => items.filter((item) => item.id !== playlist.id));
    if (activePlaylistId === playlist.id) setActivePlaylistId(null);
    setOpenPlaylistMenu(null);
  };

  const clearTrackPressTimer = () => {
    if (trackPressTimer) clearTimeout(trackPressTimer);
    setTrackPressTimer(null);
  };

  const togglePlaylistMenu = (playlistId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openPlaylistMenu === playlistId) {
      setOpenPlaylistMenu(null);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    setPlaylistMenuPosition({ top: Math.max(8, bounds.top - 8), left: Math.max(8, Math.min(bounds.left, window.innerWidth - 168)) });
    setOpenPlaylistMenu(playlistId);
  };

  const visibleMusicTracks = musicTracks
    .filter((track) => !activePlaylistId || musicPlaylists.find((playlist) => playlist.id === activePlaylistId)?.trackIds.includes(track.id))
    .filter((track) => track.name.toLowerCase().includes(musicSearch.trim().toLowerCase()));

  const playAdjacentTrack = useCallback((direction: -1 | 1) => {
    const currentIndex = visibleMusicTracks.findIndex((track) => track.name === libraryPlayback.fileName);
    if (currentIndex < 0 || !visibleMusicTracks.length) return;
    const nextIndex = shuffleLibrary
      ? Math.floor(Math.random() * visibleMusicTracks.length)
      : currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= visibleMusicTracks.length) return;
    onPlayLibrary(visibleMusicTracks[nextIndex].file);
  }, [libraryPlayback.fileName, onPlayLibrary, shuffleLibrary, visibleMusicTracks]);

  useEffect(() => {
    if (!libraryPlayback.ended || !libraryPlayback.fileName) return;
    if (repeatLibrary) {
      const currentTrack = musicTracks.find((track) => track.name === libraryPlayback.fileName);
      if (currentTrack) onPlayLibrary(currentTrack.file);
      return;
    }
    playAdjacentTrack(1);
  }, [libraryPlayback.ended, libraryPlayback.fileName, musicTracks, onPlayLibrary, playAdjacentTrack, repeatLibrary]);

  const renderPadPanel = (panelIndex: number, playback: PadPlaybackState) => (
    <div className="rounded-lg border border-[#2a3038] bg-[#0a0c10] p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Music2 size={13} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#c7ced8]">Panel {panelIndex + 1}</span>
        </div>
        <span className="text-[9px] font-mono text-[#5d6570]">15 disparadores</span>
      </div>
      {playback.isPlaying && <div className="mt-3 rounded-md border border-[#2a3038] bg-[#121519] p-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileAudio size={13} className="text-cyan-400 shrink-0" />
            <span className="truncate text-[10px] font-mono text-[#9aa3af]">{playback.fileName ?? 'Selecciona un pad para reproducir'}</span>
          </div>
          <span className="shrink-0 text-[9px] font-mono text-[#5d6570]">{formatTime(playback.currentTime)} / {formatTime(playback.duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={playback.duration || 0}
          step="0.01"
          value={Math.min(playback.currentTime, playback.duration || 0)}
          onChange={(event) => onSeekPad(panelIndex, Number(event.target.value))}
          disabled={!playback.fileName || !playback.duration}
          className="slider-fancy w-full"
          aria-label={`Línea de tiempo del Panel ${panelIndex + 1}`}
        />
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => {
              if (playback.isPlaying) {
                onPausePad(panelIndex);
                return;
              }
              if (playback.isPaused) {
                onResumePad(panelIndex);
                return;
              }
              const file = pads[panelIndex].find((padFile) => padFile?.name === playback.fileName);
              if (file) onPlayPad(file, panelIndex);
            }}
            disabled={!playback.fileName}
            className="flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {playback.isPlaying ? <Pause size={11} /> : <Play size={11} />}
            {playback.isPlaying ? 'Pausa' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => onStopPad(panelIndex)}
            disabled={!playback.fileName}
            className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Square size={10} fill="currentColor" />
            Detener
          </button>
        </div>
      </div>}
      <div className="grid grid-cols-3 grid-rows-5 gap-2">
        {pads[panelIndex].map((file, padIndex) => {
          const isActive = isPlaying && sourceType === 'pad' && fileName === file?.name;
          const menuId = `${panelIndex}-${padIndex}`;
          const color = padColors[padIndex];
          return (
            <div
              key={padIndex}
              className="relative min-w-0 rounded-md border transition-all"
              style={{
                borderColor: color.accent,
                background: color.accent,
                boxShadow: isActive ? `0 0 18px ${color.accent}` : `inset 0 0 0 1px rgba(255,255,255,0.18)`,
              }}
            >
              <button
                type="button"
                onClick={() => handlePadClick(panelIndex, padIndex)}
                onPointerDown={() => handlePadPointerDown(panelIndex, padIndex)}
                onPointerUp={handlePadPointerUp}
                onPointerLeave={handlePadPointerUp}
                onPointerCancel={handlePadPointerUp}
                onContextMenu={(event) => { event.preventDefault(); setOpenPadMenu(menuId); }}
                className="flex aspect-square w-full items-center justify-center px-2 py-2 text-center transition-all hover:brightness-110"
                title={file ? `Reproducir ${file.name}` : 'Cargar audio en este pad'}
              >
                {file && <span className="block w-full truncate text-[12px] font-medium text-[#111827]" title={file.name}>{file.name}</span>}
              </button>
              <input
                ref={(element) => { padInputRefs.current[panelIndex * 15 + padIndex] = element; }}
                type="file"
                accept="audio/*"
                onChange={(event) => handlePadFile(panelIndex, padIndex, event)}
                className="hidden"
              />
              {openPadMenu === menuId && (
                <div className="absolute z-20 left-1/2 top-1/2 w-[calc(100%-0.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-[#556170] bg-[#20252d] p-2 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => padInputRefs.current[panelIndex * 15 + padIndex]?.click()}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-[#e8ecf1] hover:bg-emerald-400/20 hover:text-emerald-200"
                  >
                    <Upload size={16} />
                    Cargar audio
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPads((current) => current.map((panel, currentPanelIndex) => currentPanelIndex === panelIndex ? panel.map((pad, currentPadIndex) => currentPadIndex === padIndex ? null : pad) : panel)); void deletePad(panelIndex, padIndex); setOpenPadMenu(null); }}
                    disabled={!file}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Square size={15} />
                    Borrar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`panel ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto rounded-none' : ''}`}>
      <div className="panel-header px-3 py-2 flex items-center gap-2">
        <span className="led led-green" />
        <span className="text-cyan-400"><Play size={14} /></span>
        <h3 className="text-xs font-bold uppercase tracking-wider">Fuente de Audio</h3>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="ml-auto flex items-center gap-1 rounded-md border border-[#353c46] bg-[#0a0c10] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#9aa3af] hover:border-cyan-400 hover:text-cyan-300"
          aria-label={isFullscreen ? 'Restaurar tamaño normal' : 'Expandir fuente de audio'}
        >
          {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          {isFullscreen ? 'Normal' : 'Pantalla completa'}
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setShowPads((visible) => {
              if (!visible) {
                setActivePanel(0);
                setShowLibrary(false);
              }
              return !visible;
            })}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${showPads ? 'border-cyan-400 bg-cyan-400/10' : 'border-[#2a3038] hover:border-[#353c46] bg-[#0a0c10]'}`}
          >
            <AudioLines size={18} className={showPads ? 'text-cyan-400' : 'text-[#5d6570]'} />
            <span className="text-[9px] uppercase tracking-wider text-[#9aa3af]">Musicalizador Live</span>
          </button>
          <button
            onClick={() => setShowLibrary((visible) => {
              if (!visible) setShowPads(false);
              return !visible;
            })}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${showLibrary ? 'border-cyan-400 bg-cyan-400/10' : 'border-[#2a3038] hover:border-[#353c46] bg-[#0a0c10]'}`}
          >
            <Library size={18} className={showLibrary ? 'text-cyan-400' : 'text-[#5d6570]'} />
            <span className="text-[9px] uppercase tracking-wider text-[#9aa3af]">Biblioteca Musical</span>
          </button>
          <button
            onClick={() => isPlaying && sourceType === 'mic' ? onStop() : onStartMic(state)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${isPlaying && sourceType === 'mic' ? 'border-cyan-400 bg-cyan-400/10' : 'border-[#2a3038] hover:border-[#353c46] bg-[#0a0c10]'}`}
          >
            <Mic size={18} className={isPlaying && sourceType === 'mic' ? 'text-cyan-400' : 'text-[#5d6570]'} />
            <span className="text-[9px] uppercase tracking-wider text-[#9aa3af]">Micrófono</span>
          </button>
          <button
            onClick={() => isPlaying && sourceType === 'tone' ? onStop() : onStartTone(state)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${isPlaying && sourceType === 'tone' ? 'border-cyan-400 bg-cyan-400/10' : 'border-[#2a3038] hover:border-[#353c46] bg-[#0a0c10]'}`}
          >
            <Radio size={18} className={isPlaying && sourceType === 'tone' ? 'text-cyan-400' : 'text-[#5d6570]'} />
            <span className="text-[9px] uppercase tracking-wider text-[#9aa3af]">Tono de Prueba</span>
          </button>
        </div>

        {showLibrary && <div className="rounded-lg border border-[#2a3038] bg-[#0a0c10] p-3 shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Library size={14} className="text-cyan-400" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#c7ced8]">Biblioteca Musical</span>
                <span className="block text-[9px] text-[#5d6570]">{musicTracks.length} canciones · reproductor local</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => musicInputRef.current?.click()} className="rounded border border-cyan-400/40 p-1.5 text-cyan-300 hover:bg-cyan-400/10" title="Importar canciones"><Upload size={12} /></button>
              <button type="button" onClick={handleSyncMusicFolder} className="rounded border border-emerald-400/40 p-1.5 text-emerald-300 hover:bg-emerald-400/10" title="Sincronizar carpeta Music"><RefreshCw size={12} /></button>
              <button type="button" onClick={handleCreatePlaylist} className="rounded border border-[#353c46] p-1.5 text-[#9aa3af] hover:text-white" title="Crear lista"><ListPlus size={12} /></button>
            </div>
          </div>
          <input ref={musicInputRef} type="file" accept="audio/*" multiple onChange={handleMusicFiles} className="hidden" />
          <div className="relative z-30 flex gap-2 overflow-x-auto overflow-y-visible mb-2 pb-1">
            <button type="button" onClick={() => setActivePlaylistId(null)} className={`shrink-0 rounded px-2 py-1 text-[9px] ${!activePlaylistId ? 'bg-cyan-400/20 text-cyan-300' : 'bg-[#121519] text-[#5d6570]'}`}>Toda la música</button>
            {musicPlaylists.map((playlist) => (
              <div key={playlist.id} className="relative flex shrink-0 items-center rounded bg-[#121519]">
                <button type="button" onClick={() => { setActivePlaylistId(playlist.id); setOpenPlaylistMenu(null); }} className={`rounded-l px-2 py-1 text-[9px] ${activePlaylistId === playlist.id ? 'bg-cyan-400/20 text-cyan-300' : 'text-[#5d6570]'}`}>{playlist.name}</button>
                <button type="button" onClick={(event) => togglePlaylistMenu(playlist.id, event)} title={`Opciones de ${playlist.name}`} className="rounded-r px-1.5 py-1 text-[#5d6570] hover:text-cyan-300"><MoreVertical size={11} /></button>
              </div>
            ))}
          </div>
          {openPlaylistMenu && (() => {
            const playlist = musicPlaylists.find((item) => item.id === openPlaylistMenu);
            if (!playlist) return null;
            return <div className="fixed z-[100] w-40 rounded-md border border-[#353c46] bg-[#20252d] p-1 shadow-2xl" style={{ top: playlistMenuPosition.top, left: playlistMenuPosition.left, transform: 'translateY(-100%)' }}>
              <button type="button" onClick={() => renamePlaylist(playlist)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-[#c7ced8] hover:bg-cyan-400/15"><Pencil size={11} /> Renombrar lista</button>
              <button type="button" onClick={() => removePlaylist(playlist)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-red-300 hover:bg-red-500/15"><X size={11} /> Borrar lista</button>
            </div>;
          })()}
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5d6570]" />
            <input
              type="search"
              value={musicSearch}
              onChange={(event) => setMusicSearch(event.target.value)}
              placeholder="Buscar canciones..."
              className="w-full rounded border border-[#2a3038] bg-[#121519] py-1.5 pl-7 pr-2 text-[10px] text-[#d5dbe3] outline-none placeholder:text-[#5d6570] focus:border-cyan-400/60"
              aria-label="Buscar canciones"
            />
          </div>
          {libraryPlayback.fileName && (
            <div className="mb-3 overflow-hidden rounded-lg border border-cyan-400/30 bg-gradient-to-br from-[#102d38] via-[#101c27] to-[#121519] p-3 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cyan-300/40 bg-cyan-300/15 text-cyan-200">
                  <Disc3 size={24} className={libraryPlayback.isPlaying ? 'animate-spin' : ''} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="mb-0.5 block text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-300">Ahora suena</span>
                  <span className="block truncate text-xs font-bold text-[#e8ecf1]">{libraryPlayback.fileName}</span>
                  <span className="block text-[9px] text-[#7f8b98]">VIENTO SUR FM · Biblioteca</span>
                </div>
                <span className="shrink-0 self-start text-[9px] font-mono text-cyan-300">{formatTime(libraryPlayback.currentTime)} / {formatTime(libraryPlayback.duration)}</span>
              </div>
              <input type="range" min="0" max={libraryPlayback.duration || 0} step="0.01" value={Math.min(libraryPlayback.currentTime, libraryPlayback.duration || 0)} onChange={(event) => onSeekLibrary(Number(event.target.value))} disabled={!libraryPlayback.duration} className="slider-fancy w-full" aria-label="Línea de tiempo de la biblioteca" />
              <div className="flex items-center justify-center gap-2 mt-2">
                <button type="button" onClick={() => onNudgeLibrary(-10)} title="Retroceder 10 segundos" className="rounded-full p-2 text-[#9aa3af] hover:bg-white/10 hover:text-white"><Rewind size={13} /></button>
                <button type="button" onClick={() => playAdjacentTrack(-1)} title="Canción anterior" className="rounded-full p-2 text-[#c7ced8] hover:bg-white/10 hover:text-white"><SkipBack size={15} /></button>
                <button type="button" onClick={libraryPlayback.isPlaying ? onPauseLibrary : onResumeLibrary} title={libraryPlayback.isPlaying ? 'Pausa' : 'Play'} className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 text-[#07131a] shadow-[0_0_14px_rgba(103,232,249,0.4)] hover:bg-cyan-200">{libraryPlayback.isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button>
                <button type="button" onClick={() => playAdjacentTrack(1)} title="Siguiente canción" className="rounded-full p-2 text-[#c7ced8] hover:bg-white/10 hover:text-white"><SkipForward size={15} /></button>
                <button type="button" onClick={() => onNudgeLibrary(10)} title="Avanzar 10 segundos" className="rounded-full p-2 text-[#9aa3af] hover:bg-white/10 hover:text-white"><FastForward size={13} /></button>
                <button type="button" onClick={onStopLibrary} title="Detener" className="rounded-full p-2 text-red-300 hover:bg-red-500/15"><Square size={12} fill="currentColor" /></button>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2">
                <button type="button" onClick={onToggleLibraryMute} title={libraryPlayback.muted ? 'Activar sonido' : 'Silenciar'} className="text-[#9aa3af] hover:text-cyan-300">{libraryPlayback.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}</button>
                <input type="range" min="0" max="1" step="0.01" value={libraryPlayback.muted ? 0 : libraryPlayback.volume} onChange={(event) => onSetLibraryVolume(Number(event.target.value))} className="slider-fancy min-w-0 flex-1" aria-label="Volumen de la biblioteca musical" />
                <span className="text-[9px] font-mono text-[#5d6570]">{Math.round((libraryPlayback.muted ? 0 : libraryPlayback.volume) * 100)}%</span>
                <button type="button" onClick={() => setShuffleLibrary((value) => !value)} title="Aleatorio" className={`rounded p-1.5 ${shuffleLibrary ? 'bg-cyan-400/20 text-cyan-300' : 'text-[#5d6570] hover:text-cyan-300'}`}><Shuffle size={12} /></button>
                <button type="button" onClick={() => setRepeatLibrary((value) => !value)} title="Repetir lista" className={`rounded p-1.5 ${repeatLibrary ? 'bg-cyan-400/20 text-cyan-300' : 'text-[#5d6570] hover:text-cyan-300'}`}><Repeat size={12} /></button>
              </div>
            </div>
          )}
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#7f8b98]">Cola de reproducción</span>
            <span className="text-[9px] font-mono text-[#5d6570]">{visibleMusicTracks.length} pistas</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {visibleMusicTracks.map((track) => (
              <div key={track.id} className={`relative flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors ${track.name === libraryPlayback.fileName ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-[#1f2730] bg-[#121519] hover:border-[#354c58]'}`} onPointerDown={() => { clearTrackPressTimer(); setTrackPressTimer(setTimeout(() => setOpenTrackMenu(track.id), 550)); }} onPointerUp={clearTrackPressTimer} onPointerLeave={clearTrackPressTimer}>
                <span className="w-5 text-center text-[9px] font-mono text-[#5d6570]">{String(musicTracks.indexOf(track) + 1).padStart(2, '0')}</span>
                <button type="button" onClick={() => onPlayLibrary(track.file)} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-cyan-300"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${track.name === libraryPlayback.fileName ? 'bg-cyan-300 text-[#07131a]' : 'bg-[#202a33] text-cyan-400'}`}>{track.name === libraryPlayback.fileName && libraryPlayback.isPlaying ? <Pause size={9} /> : <Play size={9} fill="currentColor" />}</span><span className="truncate text-[10px] text-[#c7ced8]">{track.name}</span></button>
                <button type="button" onClick={() => setOpenTrackMenu(openTrackMenu === track.id ? null : track.id)} title="Opciones del track" className="text-[#5d6570] hover:text-cyan-300"><MoreVertical size={12} /></button>
                {openTrackMenu === track.id && <div className="absolute right-1 top-full z-20 mt-1 w-44 rounded-md border border-[#353c46] bg-[#20252d] p-1 shadow-xl">
                  <button type="button" onClick={() => removeTrack(track.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-red-300 hover:bg-red-500/15"><Trash2 size={11} /> Quitar del reproductor</button>
                  <div className="border-t border-[#353c46] my-1 pt-1">
                    {activePlaylistId && musicPlaylists.find((playlist) => playlist.id === activePlaylistId)?.trackIds.includes(track.id) && <button type="button" onClick={() => void removeTrackFromPlaylist(track.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-amber-300 hover:bg-amber-400/15"><X size={11} /> Quitar de esta lista</button>}
                    <span className="px-2 text-[8px] uppercase tracking-wider text-[#5d6570]">Agregar a lista</span>
                    {musicPlaylists.length ? musicPlaylists.map((playlist) => (
                      <button key={playlist.id} type="button" onClick={() => { setActivePlaylistId(playlist.id); void addTrackToPlaylist(track.id, playlist.id); setOpenTrackMenu(null); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-[#c7ced8] hover:bg-cyan-400/15"><ListPlus size={11} /> {playlist.name}</button>
                    )) : <span className="block px-2 py-1.5 text-[9px] text-[#5d6570]">Crea una lista primero</span>}
                  </div>
                  <button type="button" onClick={() => moveTrack(track.id, -1)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-[#c7ced8] hover:bg-cyan-400/15"><ArrowUp size={11} /> Mover arriba</button>
                  <button type="button" onClick={() => moveTrack(track.id, 1)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-[#c7ced8] hover:bg-cyan-400/15"><ArrowDown size={11} /> Mover abajo</button>
                </div>}
              </div>
            ))}
            {!musicTracks.length && <p className="py-2 text-center text-[9px] text-[#5d6570]">Importa canciones o sincroniza la carpeta Music.</p>}
            {musicTracks.length > 0 && !musicTracks.some((track) => track.name.toLowerCase().includes(musicSearch.trim().toLowerCase())) && <p className="py-2 text-center text-[9px] text-[#5d6570]">No se encontraron canciones.</p>}
          </div>
        </div>}

        {showPads && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((panelIndex) => (
              <button
                key={panelIndex}
                type="button"
                aria-pressed={activePanel === panelIndex}
                onClick={() => { setActivePanel(panelIndex); setOpenPadMenu(null); }}
                className={`rounded-md border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${activePanel === panelIndex ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-[#2a3038] bg-[#121519] text-[#5d6570] hover:border-[#353c46] hover:text-[#9aa3af]'}`}
              >
                Panel {panelIndex + 1}
              </button>
            ))}
          </div>
          {renderPadPanel(activePanel, padPlayback[activePanel])}
        </div>}

        {isPlaying && (
          <div className="flex items-center justify-between bg-[#0a0c10] rounded-lg px-3 py-2 border border-[#2a3038]">
            <div className="flex items-center gap-2 min-w-0">
              <FileAudio size={14} className="text-cyan-400 flex-shrink-0" />
              <span className="text-[10px] text-[#9aa3af] truncate font-mono">
                {sourceType === 'file' ? fileName ?? 'Archivo de audio' : sourceType === 'mic' ? 'Micrófono en vivo' : 'Tono de prueba 440Hz'}
              </span>
            </div>
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Square size={10} fill="currentColor" />
              <span className="text-[9px] uppercase font-bold tracking-wider">Detener</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="text-center">
            <div className="text-[9px] text-[#5d6570] uppercase mb-1">Entrada L</div>
            <div className="font-mono text-lg font-bold" style={{ color: levels.inputL > -6 ? '#ef4444' : levels.inputL > -15 ? '#f59e0b' : '#22d3ee' }}>
              {levels.inputL <= -60 ? '-∞' : levels.inputL.toFixed(1)}
            </div>
            <div className="text-[8px] text-[#5d6570]">dB</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-[#5d6570] uppercase mb-1">Entrada R</div>
            <div className="font-mono text-lg font-bold" style={{ color: levels.inputR > -6 ? '#ef4444' : levels.inputR > -15 ? '#f59e0b' : '#22d3ee' }}>
              {levels.inputR <= -60 ? '-∞' : levels.inputR.toFixed(1)}
            </div>
            <div className="text-[8px] text-[#5d6570]">dB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
