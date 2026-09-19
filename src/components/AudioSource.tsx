import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Mic, Radio, Square, Play, Pause, Music2, AudioLines, Maximize2, Minimize2, RefreshCw, FileAudio, Volume2, Library, Search, ListMusic, FolderOpen, Disc3, Users, X, GripVertical, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import type { ProcessorState, AudioSourceType } from '../types';
import type { AudioInputDevice, AudioLevels, PadPlaybackState } from '../useAudioEngine';
import { deletePad, loadStoredPads, savePad } from '../padStorage';
import { deletePlaylist, deleteTrack, loadPlaylists, loadTracks, readTrackMetadata, savePlaylist, saveTrack, scanAndroidMusicFolder, type MusicPlaylist, type MusicTrack } from '../musicLibrary';

interface AudioSourceProps {
  sourceType: AudioSourceType;
  onSourceTypeChange: (t: AudioSourceType) => void;
  onStartMic: (state: ProcessorState) => void;
  onStartTone: (state: ProcessorState) => void;
  audioInputDevices: AudioInputDevice[];
  selectedInputDeviceId: string;
  onSelectedInputDeviceChange: (deviceId: string) => void;
  onRefreshAudioInputDevices: () => void;
  onPlayPad: (file: File, panelIndex: number) => void;
  onPausePad: (panelIndex: number) => void;
  onResumePad: (panelIndex: number) => void;
  onSeekPad: (panelIndex: number, time: number) => void;
  onSetPadVolume: (panelIndex: number, volume: number) => void;
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
  audioInputDevices,
  selectedInputDeviceId,
  onSelectedInputDeviceChange,
  onRefreshAudioInputDevices,
  onPlayPad,
  onPausePad,
  onResumePad,
  onSeekPad,
  onSetPadVolume,
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
  const padButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressPadClickRef = useRef(false);
  const padPressStartRef = useRef<{ x: number; y: number } | null>(null);

  const [pads, setPads] = useState<Array<Array<File | null>>>(() => [
    Array.from({ length: 15 }, () => null),
    Array.from({ length: 15 }, () => null),
  ]);

  const [openPadMenu, setOpenPadMenu] = useState<string | null>(null);
  const [padMenuPosition, setPadMenuPosition] = useState({ top: 0, left: 0 });
  const [showPads, setShowPads] = useState(false);
  const [padsFullscreen, setPadsFullscreen] = useState(false);
  const [showLineInSettings, setShowLineInSettings] = useState(false);
  const [lineInFullscreen, setLineInFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState(0);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryTracks, setLibraryTracks] = useState<MusicTrack[]>([]);
  const [libraryQueue, setLibraryQueue] = useState<MusicTrack[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySection, setLibrarySection] = useState<'library' | 'playlists' | 'artists' | 'albums' | 'folders'>('library');
  const [libraryFilter, setLibraryFilter] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['Music']);
  const [folderScanState, setFolderScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [folderScanMessage, setFolderScanMessage] = useState('');
  const [libraryPlaylists, setLibraryPlaylists] = useState<MusicPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
  const [trackMenuId, setTrackMenuId] = useState<string | null>(null);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [nowPlayingExpanded, setNowPlayingExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [ambientColor, setAmbientColor] = useState('#167b83');
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const previousPlaybackRef = useRef(padPlayback[0]);

  useEffect(() => {
    loadStoredPads().then(setPads);
    void loadTracks().then(setLibraryTracks).catch(() => undefined);
    void loadPlaylists().then(setLibraryPlaylists).catch(() => undefined);
  }, []);

  useEffect(() => {
    const previous = previousPlaybackRef.current;
    const current = padPlayback[0];
    if (previous.isPlaying && !current.isPlaying && !current.isPaused && current.currentTime === 0) {
      const nextTrack = repeatMode === 'one'
        ? libraryQueue[0]
        : shuffleEnabled
          ? libraryQueue.slice(1)[Math.floor(Math.random() * Math.max(1, libraryQueue.length - 1))]
          : libraryQueue[1];
      const fallbackTrack = nextTrack || (repeatMode === 'all' ? libraryQueue[0] : undefined);
      if (fallbackTrack) {
        setLibraryQueue((queue) => [fallbackTrack, ...queue.filter((item) => item.id !== fallbackTrack.id)]);
        onPlayPad(fallbackTrack.file, 0);
      }
    }
    previousPlaybackRef.current = current;
  }, [padPlayback, libraryQueue, onPlayPad, repeatMode, shuffleEnabled]);

  useEffect(() => {
    const coverUrl = libraryQueue[0]?.coverUrl;
    if (!coverUrl) {
      setAmbientColor('#167b83');
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      setAmbientColor(`rgb(${red}, ${green}, ${blue})`);
    };
    image.src = coverUrl;
  }, [libraryQueue]);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
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

  const closePadMenu = useCallback(() => {
    setOpenPadMenu(null);
  }, []);

  useEffect(() => {
    if (!openPadMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menuElement = document.getElementById(`pad-menu-${openPadMenu}`);
      const triggerElement = document.getElementById(`pad-button-${openPadMenu}`);
      const target = event.target as Node | null;

      if (!menuElement || !triggerElement) {
        closePadMenu();
        return;
      }

      const clickedInsideMenu = menuElement.contains(target);
      const clickedOnTrigger = triggerElement.contains(target);

      if (!clickedInsideMenu && !clickedOnTrigger) {
        closePadMenu();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closePadMenu, openPadMenu]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

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

  const handlePadPointerDown = (panelIndex: number, padIndex: number, event?: React.PointerEvent<HTMLButtonElement>) => {
    clearLongPressTimer();
    suppressPadClickRef.current = false;
    padPressStartRef.current = event ? { x: event.clientX, y: event.clientY } : null;

    if (event && event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    longPressTimerRef.current = setTimeout(() => {
      const button = padButtonRefs.current[panelIndex * 15 + padIndex];
      const rect = button?.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 132;
      const padding = 12;

      const nextLeft = rect
        ? clamp(rect.left + rect.width / 2 - menuWidth / 2, padding, window.innerWidth - menuWidth - padding)
        : window.innerWidth / 2 - menuWidth / 2;
      const nextTop = rect
        ? clamp(rect.top + rect.height / 2 - menuHeight / 2, padding, window.innerHeight - menuHeight - padding)
        : window.innerHeight / 2 - menuHeight / 2;

      suppressPadClickRef.current = true;
      setPadMenuPosition({ top: nextTop, left: nextLeft });
      setOpenPadMenu(`${panelIndex}-${padIndex}`);
    }, 450);
  };

  const handlePadPointerMove = (panelIndex: number, padIndex: number, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!padPressStartRef.current) return;

    const deltaX = Math.abs(event.clientX - padPressStartRef.current.x);
    const deltaY = Math.abs(event.clientY - padPressStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      clearLongPressTimer();
    }
  };

  const handlePadPointerUp = () => {
    padPressStartRef.current = null;
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

  const handleLibraryFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) {
      const newTracks = await Promise.all(files.map((file) => readTrackMetadata(file)));
      await Promise.all(newTracks.map(saveTrack));
      setLibraryTracks((current) => {
        const existing = new Set(current.map((track) => track.id));
        return [...current, ...newTracks.filter((track) => !existing.has(track.id))];
      });
      setLibraryQueue((current) => [...current, ...newTracks]);
    }
    event.target.value = '';
  };

  const openFolderPicker = () => {
    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.click();
  };

  const handleFolderFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => /\.(mp3|wav|flac|m4a|aac|ogg)$/i.test(file.name));
    setFolderScanState('scanning');
    setFolderScanMessage(`Analizando ${files.length} archivos de la carpeta...`);
    if (files.length) {
      const newTracks = await Promise.all(files.map((file) => {
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        const folderPath = relativePath ? relativePath.split('/').slice(0, -1).join('/') : undefined;
        return readTrackMetadata(file, 'local', folderPath);
      }));
      await Promise.all(newTracks.map(saveTrack));
      setLibraryTracks((current) => {
        const existing = new Set(current.map((track) => track.id));
        return [...current, ...newTracks.filter((track) => !existing.has(track.id))];
      });
      setFolderScanState('success');
      setFolderScanMessage(`${newTracks.length} pistas añadidas desde la carpeta.`);
    } else {
      setFolderScanState('error');
      setFolderScanMessage('La carpeta no contiene archivos de audio compatibles.');
    }
    event.target.value = '';
  };

  const handleAndroidScan = async () => {
    setFolderScanState('scanning');
    setFolderScanMessage('Buscando audio en Music y sus subcarpetas...');
    try {
      const scannedTracks = await scanAndroidMusicFolder();
      setLibraryTracks((current) => {
        const existing = new Set(current.map((track) => track.id));
        return [...current, ...scannedTracks.filter((track) => !existing.has(track.id))];
      });
      setFolderScanState('success');
      setFolderScanMessage(scannedTracks.length ? `${scannedTracks.length} pistas encontradas en Music.` : 'No se encontraron archivos de audio en Music.');
    } catch {
      setFolderScanState('error');
      setFolderScanMessage('No se pudo acceder a Music. Concede permisos de almacenamiento o selecciona una carpeta manualmente.');
    }
  };

  const createPlaylist = () => {
    const name = window.prompt('Nombre de la lista:')?.trim();
    if (!name) return;
    const timestamp = Date.now();
    const playlist: MusicPlaylist = { id: `playlist-${timestamp}`, name, trackIds: [], createdAt: timestamp, updatedAt: timestamp };
    const nextPlaylists = [...libraryPlaylists, playlist];
    setLibraryPlaylists(nextPlaylists);
    void savePlaylist(playlist);
    setActivePlaylistId(playlist.id);
    setLibrarySection('playlists');
  };

  const renamePlaylist = async (playlist: MusicPlaylist) => {
    const name = window.prompt('Nuevo nombre de la lista:', playlist.name)?.trim();
    if (!name || name === playlist.name) return;
    const updatedPlaylist = { ...playlist, name, updatedAt: Date.now() };
    setLibraryPlaylists((current) => current.map((item) => item.id === playlist.id ? updatedPlaylist : item));
    await savePlaylist(updatedPlaylist);
  };

  const removePlaylist = async (playlist: MusicPlaylist) => {
    if (!window.confirm(`¿Eliminar la lista "${playlist.name}"?`)) return;
    setLibraryPlaylists((current) => current.filter((item) => item.id !== playlist.id));
    if (activePlaylistId === playlist.id) {
      setActivePlaylistId(null);
      setLibraryFilter('');
    }
    await deletePlaylist(playlist.id);
  };

  const removeTrackFromPlaylist = async (track: MusicTrack, playlist: MusicPlaylist) => {
    const updatedPlaylist = { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== track.id), updatedAt: Date.now() };
    setLibraryPlaylists((current) => current.map((item) => item.id === playlist.id ? updatedPlaylist : item));
    await savePlaylist(updatedPlaylist);
  };

  const addTrackToPlaylist = async (track: MusicTrack, playlist: MusicPlaylist) => {
    if (playlist.trackIds.includes(track.id)) return;
    const updatedPlaylist = { ...playlist, trackIds: [...playlist.trackIds, track.id], updatedAt: Date.now() };
    setLibraryPlaylists((current) => current.map((item) => item.id === playlist.id ? updatedPlaylist : item));
    await savePlaylist(updatedPlaylist);
  };

  const openAddToPlaylistMenu = (track: MusicTrack) => {
    setTrackMenuId(track.id);
    setSelectedPlaylistIds(libraryPlaylists.filter((playlist) => playlist.trackIds.includes(track.id)).map((playlist) => playlist.id));
  };

  const saveTrackPlaylistSelection = async (track: MusicTrack) => {
    const updates = libraryPlaylists.map((playlist) => {
      const shouldContainTrack = selectedPlaylistIds.includes(playlist.id);
      const containsTrack = playlist.trackIds.includes(track.id);
      if (shouldContainTrack === containsTrack) return playlist;
      return {
        ...playlist,
        trackIds: shouldContainTrack ? [...playlist.trackIds, track.id] : playlist.trackIds.filter((id) => id !== track.id),
        updatedAt: Date.now(),
      };
    });
    setLibraryPlaylists(updates);
    await Promise.all(updates.map((playlist, index) => playlist !== libraryPlaylists[index] ? savePlaylist(playlist) : Promise.resolve()));
    setTrackMenuId(null);
  };

  const removeTrackFromLibrary = async (track: MusicTrack) => {
    if (!window.confirm(`¿Quitar "${track.name}" de la biblioteca?`)) return;
    await deleteTrack(track.id);
    setLibraryTracks((current) => current.filter((item) => item.id !== track.id));
    setLibraryQueue((current) => current.filter((item) => item.id !== track.id));
    const updatedPlaylists = libraryPlaylists.map((playlist) => ({
      ...playlist,
      trackIds: playlist.trackIds.filter((id) => id !== track.id),
      updatedAt: Date.now(),
    }));
    setLibraryPlaylists(updatedPlaylists);
    await Promise.all(updatedPlaylists.map(savePlaylist));
    if (track.coverUrl) URL.revokeObjectURL(track.coverUrl);
  };

  const playPlaylist = (playlist: MusicPlaylist) => {
    const tracks = playlist.trackIds.map((id) => libraryTracks.find((track) => track.id === id)).filter((track): track is MusicTrack => Boolean(track));
    if (!tracks.length) return;
    setLibraryQueue(tracks);
    setActivePlaylistId(playlist.id);
    onPlayPad(tracks[0].file, 0);
  };

  const playFolder = (folderPath: string) => {
    const tracks = libraryTracks.filter((track) => track.folderPath === folderPath || track.folderPath?.startsWith(`${folderPath}/`));
    if (!tracks.length) return;
    setLibraryQueue(tracks);
    setLibraryFilter(folderPath);
    onPlayPad(tracks[0].file, 0);
  };

  const playCollection = (value: string, type: 'artist' | 'album') => {
    const tracks = libraryTracks.filter((track) => type === 'artist' ? track.artist === value : track.album === value);
    if (!tracks.length) return;
    setLibraryQueue(tracks);
    setLibraryFilter(value);
    onPlayPad(tracks[0].file, 0);
  };

  const clearPlaybackQueue = () => {
    setLibraryQueue([]);
    onStopPad(0);
  };

  const playLibraryTrack = (track: MusicTrack) => {
    onPlayPad(track.file, 0);
    setLibraryQueue((current) => [track, ...current.filter((item) => item.id !== track.id)]);
  };

  const playNextTrack = () => {
    if (libraryQueue[1]) playLibraryTrack(libraryQueue[1]);
  };

  const playPreviousTrack = () => {
    if (libraryQueue.length > 1) playLibraryTrack(libraryQueue[libraryQueue.length - 1]);
  };

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const mediaSession = navigator.mediaSession;
    mediaSession.setActionHandler('play', () => {
      if (padPlayback[0]?.isPaused || !padPlayback[0]?.isPlaying) onResumePad(0);
    });
    mediaSession.setActionHandler('pause', () => onPausePad(0));
    mediaSession.setActionHandler('previoustrack', playPreviousTrack);
    mediaSession.setActionHandler('nexttrack', playNextTrack);
    mediaSession.setActionHandler('seekbackward', () => onSeekPad(0, Math.max(0, (padPlayback[0]?.currentTime || 0) - 10)));
    mediaSession.setActionHandler('seekforward', () => onSeekPad(0, Math.min(padPlayback[0]?.duration || 0, (padPlayback[0]?.currentTime || 0) + 10)));
    mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') onSeekPad(0, details.seekTime);
    });

    const activeTrack = libraryQueue[0];
    if (activeTrack) {
      mediaSession.metadata = new MediaMetadata({
        title: activeTrack.name,
        artist: activeTrack.artist,
        album: activeTrack.album,
        artwork: activeTrack.coverUrl ? [{ src: activeTrack.coverUrl }] : undefined,
      });
    }
    mediaSession.playbackState = padPlayback[0]?.isPlaying ? 'playing' : padPlayback[0]?.isPaused ? 'paused' : 'none';

    return () => {
      ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto'].forEach((action) => mediaSession.setActionHandler(action as MediaSessionAction, null));
    };
  }, [libraryQueue, padPlayback, onPausePad, onResumePad, onSeekPad]);

  const searchedLibraryTracks = libraryTracks.filter((track) => {
    const query = librarySearch.trim().toLowerCase();
    const matchesSearch = !query || `${track.file.name} ${track.artist} ${track.album}`.toLowerCase().includes(query);
    const matchesFilter = !libraryFilter || (librarySection === 'artists' ? track.artist === libraryFilter : librarySection === 'albums' ? track.album === libraryFilter : librarySection === 'folders' ? track.folderPath === libraryFilter || track.folderPath?.startsWith(`${libraryFilter}/`) : true);
    return matchesSearch && matchesFilter;
  });

  const filteredLibraryTracks = librarySection === 'playlists'
    ? searchedLibraryTracks.filter((track) => libraryPlaylists.find((playlist) => playlist.id === activePlaylistId)?.trackIds.includes(track.id))
    : searchedLibraryTracks;

  const libraryGroups = librarySection === 'artists'
    ? [...new Set(libraryTracks.map((track) => track.artist))]
    : librarySection === 'albums'
      ? [...new Set(libraryTracks.map((track) => track.album))]
      : librarySection === 'folders'
        ? [...new Set(libraryTracks.flatMap((track) => {
          if (!track.folderPath) return [];
          const parts = track.folderPath.split('/');
          return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
        }))].sort()
        : [];

  const visibleLibraryGroups = librarySection === 'folders'
    ? libraryGroups.filter((group) => {
      const parts = group.split('/');
      return parts.slice(0, -1).every((_, index) => expandedFolders.includes(parts.slice(0, index + 1).join('/')));
    })
    : libraryGroups;

  const renderLibraryTrack = (track: MusicTrack, index: number) => (
    <div key={track.id} className="group relative flex w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2 text-left transition hover:bg-white/[0.06]">
      <button type="button" onClick={() => { const playlist = libraryPlaylists.find((item) => item.id === addingToPlaylistId); if (playlist) void addTrackToPlaylist(track, playlist); else playLibraryTrack(track); }} className="flex min-w-0 flex-1 items-center gap-3 text-left" title={addingToPlaylistId ? `Añadir ${track.name} a la lista` : `Reproducir ${track.name}`}>
        <span className="w-5 text-center text-[10px] font-mono text-[#71808e] group-hover:hidden">{index + 1}</span>
        {addingToPlaylistId ? <span className="w-5 text-center text-cyan-300">{libraryPlaylists.find((item) => item.id === addingToPlaylistId)?.trackIds.includes(track.id) ? '✓' : '+'}</span> : <Play size={12} className="hidden w-5 text-cyan-300 group-hover:block" />}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-cyan-400/30 to-violet-500/30 text-cyan-200">
          {track.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover" /> : <FileAudio size={16} />}
        </div>
        <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold text-[#e7edf4]">{track.name}</div><div className="truncate text-[9px] text-[#82909d]">{track.artist} · {track.album}</div></div>
        <span className="text-[9px] text-[#697784]">{(track.file.size / 1024 / 1024).toFixed(1)} MB</span>
      </button>
      {!addingToPlaylistId && <button type="button" onClick={() => openAddToPlaylistMenu(track)} className="rounded px-2 py-1 text-[10px] text-[#82909d] hover:bg-white/10 hover:text-cyan-300" title="Agregar a lista">+</button>}
      {activePlaylistId && librarySection === 'playlists' && <button type="button" onClick={() => { const playlist = libraryPlaylists.find((item) => item.id === activePlaylistId); if (playlist) void removeTrackFromPlaylist(track, playlist); }} className="rounded px-2 py-1 text-[10px] text-red-300 hover:bg-red-400/10" title="Quitar de la lista">−</button>}
      <button type="button" onClick={() => void removeTrackFromLibrary(track)} className="rounded px-2 py-1 text-[10px] text-[#82909d] hover:bg-red-400/10 hover:text-red-300" title="Quitar de la biblioteca">×</button>
      {trackMenuId === track.id && <div className="absolute right-3 top-10 z-20 w-56 rounded-lg border border-[#35414d] bg-[#151c24] p-3 shadow-2xl"><div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-[#9baab6]">Agregar a listas</div>{libraryPlaylists.length ? libraryPlaylists.map((playlist) => <label key={playlist.id} className="flex items-center gap-2 rounded px-1 py-1.5 text-[10px] text-[#d7e0e8] hover:bg-white/[0.06]"><input type="checkbox" checked={selectedPlaylistIds.includes(playlist.id)} onChange={(event) => setSelectedPlaylistIds((current) => event.target.checked ? [...current, playlist.id] : current.filter((id) => id !== playlist.id))} />{playlist.name}</label>) : <span className="text-[10px] text-[#778692]">Crea una lista primero.</span>}<div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setTrackMenuId(null)} className="rounded px-2 py-1 text-[9px] text-[#98a6b1]">Cancelar</button><button type="button" onClick={() => void saveTrackPlaylistSelection(track)} className="rounded bg-cyan-400/15 px-2 py-1 text-[9px] font-bold text-cyan-300">Guardar</button></div></div>}
    </div>
  );

  const renderLibrary = () => (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#080b10] text-[#e8ecf1]">
      <div className="flex min-h-12 items-center justify-between border-b border-white/[0.08] px-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Library size={17} className="text-cyan-300" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Biblioteca musical</span>
          <span className="hidden rounded-full bg-white/[0.07] px-2 py-0.5 text-[9px] text-[#94a3af] sm:inline">Local · {libraryTracks.length}</span>
        </div>
        <button type="button" onClick={() => setShowLibrary(false)} className="rounded-md p-1.5 text-[#95a1ad] hover:bg-white/[0.08] hover:text-white" title="Cerrar biblioteca">
          <X size={17} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 border-r border-white/[0.08] bg-[#0b0f15] p-3 sm:block">
          <div className="mb-2 px-2 text-[8px] font-bold uppercase tracking-[0.2em] text-[#667482]">Tu biblioteca</div>
          {[
            ['library', Library, 'Biblioteca local'],
            ['playlists', ListMusic, 'Listas'],
            ['artists', Users, 'Artistas'],
            ['albums', Disc3, 'Álbumes'],
            ['folders', FolderOpen, 'Carpetas'],
          ].map(([id, Icon, label]) => (
            <button key={String(id)} type="button" onClick={() => setLibrarySection(id as typeof librarySection)} className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[10px] transition ${librarySection === id ? 'bg-cyan-400/10 text-cyan-300' : 'text-[#8996a2] hover:bg-white/[0.05] hover:text-white'}`}>
              <Icon size={14} />{label as string}
            </button>
          ))}
          <button type="button" onClick={() => libraryInputRef.current?.click()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20">
            <FolderOpen size={13} /> Importar audio
          </button>
          <button type="button" onClick={() => void handleAndroidScan()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-[#a4b0bb] hover:bg-white/[0.08] hover:text-white">
            <RefreshCw size={13} /> Escanear Music
          </button>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto pb-24" style={{ background: `linear-gradient(135deg, ${ambientColor}55, rgba(13, 18, 27, .97) 58%, rgba(65, 35, 75, .3))` }}>
          <div className="mx-auto max-w-5xl p-3 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">{librarySection === 'library' ? 'Colección local' : librarySection}</div>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">Tu música</h2>
              </div>
              <select value={librarySection} onChange={(event) => { setLibrarySection(event.target.value as typeof librarySection); setLibraryFilter(''); }} className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-[10px] text-[#c3ced8] outline-none sm:hidden" aria-label="Sección de biblioteca">
                <option value="library">Biblioteca</option>
                <option value="playlists">Listas</option>
                <option value="artists">Artistas</option>
                <option value="albums">Álbumes</option>
                <option value="folders">Carpetas</option>
              </select>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-md border border-white/[0.1] bg-black/20 px-2.5 py-2 text-[#8d9aa6] focus-within:border-cyan-400/50">
                  <Search size={13} />
                  <input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Buscar" className="w-24 bg-transparent text-[10px] text-white outline-none placeholder:text-[#687581] sm:w-40" />
                </label>
                <button type="button" onClick={() => libraryInputRef.current?.click()} className="rounded-md border border-white/[0.1] bg-black/20 p-2 text-[#9aabb8] hover:text-white" title="Añadir archivos">
                  <Upload size={14} />
                </button>
              </div>
            </div>

            <input ref={libraryInputRef} type="file" accept="audio/mpeg,audio/wav,audio/flac,audio/*" multiple onChange={handleLibraryFiles} className="hidden" />
            <input ref={folderInputRef} type="file" multiple onChange={handleFolderFiles} className="hidden" />

            {librarySection === 'folders' && (
              <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderOpen size={18} className="shrink-0 text-cyan-300" />
                    <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Explorador de carpetas</div><div className="truncate text-[9px] text-[#8d9ca9]">Escanea Music en Android o selecciona una carpeta desde este dispositivo.</div></div>
                  </div>
                  <div className="flex shrink-0 gap-2"><button type="button" onClick={() => void handleAndroidScan()} disabled={folderScanState === 'scanning'} className="rounded-md border border-cyan-400/35 bg-cyan-400/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20 disabled:cursor-wait disabled:opacity-50">{folderScanState === 'scanning' ? 'Escaneando...' : 'Escanear Music'}</button><button type="button" onClick={openFolderPicker} disabled={folderScanState === 'scanning'} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[#c0ccd6] hover:bg-white/[0.08] disabled:opacity-50">Elegir carpeta</button></div>
                </div>
                {folderScanMessage && <div className={`mt-2 text-[10px] ${folderScanState === 'error' ? 'text-red-300' : folderScanState === 'success' ? 'text-emerald-300' : 'text-[#91a2af]'}`}>{folderScanMessage}</div>}
              </div>
            )}

            {addingToPlaylistId && libraryPlaylists.find((playlist) => playlist.id === addingToPlaylistId) && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2">
                <span className="min-w-0 truncate text-[10px] text-cyan-200">Añadiendo canciones a <strong>{libraryPlaylists.find((playlist) => playlist.id === addingToPlaylistId)?.name}</strong>. Pulsa una pista para agregarla.</span>
                <button type="button" onClick={() => { setAddingToPlaylistId(null); setLibrarySection('playlists'); }} className="shrink-0 rounded border border-cyan-300/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-400/15">Terminar</button>
              </div>
            )}

            {librarySection === 'playlists' ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={createPlaylist} className="rounded-md border border-cyan-400/35 bg-cyan-400/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20">+ Nueva lista</button>
                {libraryPlaylists.map((playlist) => <div key={playlist.id} className={`flex items-center gap-1 rounded-md border px-2 py-1.5 ${activePlaylistId === playlist.id ? 'border-cyan-400/50 bg-cyan-400/15' : 'border-white/10'}`}><button type="button" onClick={() => { setActivePlaylistId(playlist.id); setLibraryFilter(playlist.name); }} className="text-left text-[9px] text-[#cbd6df]">{playlist.name} · {playlist.trackIds.length}</button><button type="button" onClick={() => playPlaylist(playlist)} className="p-1 text-cyan-300" title="Reproducir lista"><Play size={11} /></button><button type="button" onClick={() => void renamePlaylist(playlist)} className="p-1 text-[#91a0ad] hover:text-white" title="Renombrar lista">✎</button><button type="button" onClick={() => void removePlaylist(playlist)} className="p-1 text-red-300 hover:text-red-200" title="Eliminar lista">×</button></div>)}
                {!libraryPlaylists.length && <span className="text-[10px] text-[#788794]">Crea una lista para guardar tus pistas favoritas.</span>}
              </div>
            ) : (librarySection === 'artists' || librarySection === 'albums') && libraryGroups.length > 0 ? (
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {libraryGroups.map((group) => {
                  const groupTracks = libraryTracks.filter((track) => librarySection === 'artists' ? track.artist === group : track.album === group);
                  return <div key={group} className={`flex items-center gap-3 rounded-lg border p-2 ${libraryFilter === group ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03]'}`}><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-cyan-400/25 to-violet-500/25 text-cyan-200">{groupTracks[0]?.coverUrl ? <img src={groupTracks[0].coverUrl} alt="" className="h-full w-full object-cover" /> : librarySection === 'artists' ? <Users size={17} /> : <Disc3 size={17} />}</div><button type="button" onClick={() => setLibraryFilter(group)} className="min-w-0 flex-1 text-left"><div className="truncate text-[10px] font-semibold text-white">{group}</div><div className="text-[9px] text-[#81909d]">{groupTracks.length} {groupTracks.length === 1 ? 'pista' : 'pistas'}</div></button><button type="button" onClick={() => playCollection(group, librarySection === 'artists' ? 'artist' : 'album')} className="rounded-full border border-cyan-400/30 p-2 text-cyan-300 hover:bg-cyan-400/15" title={`Reproducir ${group}`}><Play size={12} fill="currentColor" /></button></div>;
                })}
              </div>
            ) : libraryGroups.length > 0 ? (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => setLibraryFilter('')} className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] ${!libraryFilter ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-[#91a0ad]'}`}>Todos</button>
                {visibleLibraryGroups.map((group) => {
                  const depth = librarySection === 'folders' ? group.split('/').length - 1 : 0;
                  const isExpanded = expandedFolders.includes(group);
                  const hasChildren = librarySection === 'folders' && libraryGroups.some((candidate) => candidate.startsWith(`${group}/`));
                  return <div key={group} className="flex shrink-0 items-center gap-1" style={{ marginLeft: `${depth * 12}px` }}><button type="button" onClick={() => { setLibraryFilter(group); if (hasChildren) setExpandedFolders((current) => isExpanded ? current.filter((item) => item !== group) : [...current, group]); }} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[9px] ${libraryFilter === group ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-[#91a0ad]'}`}>{hasChildren && <span>{isExpanded ? '▾' : '▸'}</span>}{librarySection === 'folders' ? `📁 ${group}` : group}</button>{librarySection === 'folders' && <button type="button" onClick={() => playFolder(group)} className="rounded-full border border-cyan-400/25 p-1.5 text-cyan-300 hover:bg-cyan-400/15" title={`Reproducir carpeta ${group}`}><Play size={10} fill="currentColor" /></button>}</div>;
                })}
              </div>
            ) : null}

            {libraryTracks.length === 0 ? (
              <button type="button" onClick={() => libraryInputRef.current?.click()} className="flex min-h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/15 text-center hover:border-cyan-400/50">
                <FolderOpen size={28} className="mb-3 text-cyan-300" />
                <span className="text-sm font-semibold text-white">Añade música desde tu dispositivo</span>
                <span className="mt-1 text-[10px] text-[#8a98a5]">MP3, WAV y FLAC · los archivos permanecen en esta sesión</span>
              </button>
            ) : filteredLibraryTracks.length ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-[#0b1017]/70 backdrop-blur-sm">
                <div className="grid grid-cols-[2rem_2.25rem_minmax(0,1fr)_4rem] items-center gap-3 border-b border-white/[0.08] px-3 py-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#71808e]"><span>#</span><span /><span>Título</span><span>Tamaño</span></div>
                {filteredLibraryTracks.map(renderLibraryTrack)}
              </div>
            ) : librarySection === 'playlists' ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/15 p-6 text-center">
                {activePlaylistId ? (
                  <>
                    <ListMusic size={25} className="mx-auto mb-3 text-cyan-300" />
                    <div className="text-sm font-semibold text-white">Esta lista está vacía</div>
                    <div className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-[#788794]">Añade canciones desde tu biblioteca para comenzar a reproducirla.</div>
                    <button type="button" onClick={() => { setAddingToPlaylistId(activePlaylistId); setLibrarySection('library'); setLibraryFilter(''); }} className="mt-4 rounded-md border border-cyan-400/35 bg-cyan-400/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20">Añadir canciones</button>
                  </>
                ) : (
                  <>
                    <Library size={25} className="mx-auto mb-3 text-cyan-300" />
                    <div className="text-sm font-semibold text-white">Elige una lista para comenzar</div>
                    <div className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-[#788794]">Selecciona una lista existente o crea una nueva para organizar tu música.</div>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {libraryPlaylists.map((playlist) => <button key={playlist.id} type="button" onClick={() => { setActivePlaylistId(playlist.id); setLibraryFilter(playlist.name); }} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] text-[#c6d1db] hover:border-cyan-400/40 hover:text-cyan-300">{playlist.name}</button>)}
                      <button type="button" onClick={createPlaylist} className="rounded-md border border-cyan-400/35 bg-cyan-400/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20">+ Nueva lista</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/15 p-6 text-center text-[10px] text-[#788794]">No hay pistas que coincidan con este filtro.</div>
            )}

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="rounded-xl border border-white/[0.09] bg-[#0b1017]/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a7b3bf]">Cola de reproducción</span><div className="flex items-center gap-1"><button type="button" onClick={() => setShuffleEnabled((enabled) => !enabled)} className={`rounded p-1 ${shuffleEnabled ? 'bg-cyan-400/15 text-cyan-300' : 'text-[#657583] hover:text-white'}`} title="Aleatorio"><Shuffle size={12} /></button><button type="button" onClick={() => setRepeatMode((mode) => mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off')} className={`rounded p-1 ${repeatMode !== 'off' ? 'bg-cyan-400/15 text-cyan-300' : 'text-[#657583] hover:text-white'}`} title="Repetir">{repeatMode === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}</button><button type="button" onClick={clearPlaybackQueue} className="rounded p-1 text-[#657583] hover:text-red-300" title="Limpiar cola">×</button><span className="ml-1 text-[9px] text-[#657583]">Arrastra para ordenar</span></div></div>
                <input type="range" min="0" max={padPlayback[0]?.duration || libraryQueue[0]?.duration || 0} value={Math.min(padPlayback[0]?.currentTime || 0, padPlayback[0]?.duration || 0)} onChange={(event) => onSeekPad(0, Number(event.target.value))} disabled={!padPlayback[0]?.duration} className="slider-fancy mb-2 w-full" aria-label="Progreso de la cola" />
                {libraryQueue.length ? libraryQueue.slice(0, 5).map((track, index) => <div key={`${track.id}-${index}`} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData('text/plain')); if (Number.isNaN(from) || from === index) return; setLibraryQueue((current) => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); return next; }); }} className="flex items-center gap-2 border-b border-white/[0.05] py-2 text-[10px]"><GripVertical size={13} className="text-[#5d6b77]" /><span className="min-w-0 flex-1 truncate text-[#dce5ed]">{track.name}</span><button type="button" onClick={() => playLibraryTrack(track)} className="text-cyan-300"><Play size={12} /></button></div>) : <div className="py-4 text-[10px] text-[#687784]">Reproduce una pista para crear tu cola.</div>}
              </div>
            </div>
          </div>
        </main>
      </div>

      {libraryQueue[0] && <div className="fixed bottom-0 left-0 right-0 z-[72] border-t border-white/[0.1] bg-[#0b1017]/95 px-3 py-2 backdrop-blur-xl sm:px-5"><div className="mx-auto flex max-w-5xl items-center gap-3"><button type="button" onClick={() => setNowPlayingExpanded(true)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-cyan-400/30 to-violet-500/30 text-cyan-200">{libraryQueue[0].coverUrl ? <img src={libraryQueue[0].coverUrl} alt="" className="h-full w-full object-cover" /> : <FileAudio size={16} />}</div><div className="min-w-0"><div className="truncate text-[10px] font-semibold text-white">{libraryQueue[0].name}</div><div className="truncate text-[9px] text-[#83919e]">{libraryQueue[0].artist}</div></div></button><button type="button" onClick={() => playLibraryTrack(libraryQueue[0])} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0b1017] hover:bg-cyan-200" title="Reproducir"><Play size={13} fill="currentColor" /></button><div className="hidden w-36 items-center gap-2 sm:flex"><Volume2 size={13} className="text-[#82909d]" /><input type="range" min="0" max="1" step="0.01" value={padPlayback[0]?.volume ?? 1} onChange={(event) => onSetPadVolume(0, Number(event.target.value))} className="slider-fancy w-full" aria-label="Volumen de biblioteca" /></div></div></div>}

      {nowPlayingExpanded && libraryQueue[0] && <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#080b10]/95 p-6 backdrop-blur-xl"><button type="button" onClick={() => setNowPlayingExpanded(false)} className="absolute right-4 top-4 rounded-md p-2 text-[#95a1ad] hover:bg-white/[0.08]" title="Cerrar reproducción ampliada"><X size={20} /></button><div className="flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400/35 via-violet-500/25 to-emerald-400/20 text-cyan-100 shadow-2xl sm:h-72 sm:w-72">{libraryQueue[0].coverUrl ? <img src={libraryQueue[0].coverUrl} alt="" className="h-full w-full object-cover" /> : <FileAudio size={72} />}</div><div className="mt-6 w-full max-w-md text-center"><div className="truncate text-lg font-bold text-white">{libraryQueue[0].name}</div><div className="mt-1 text-xs text-[#94a3af]">{libraryQueue[0].artist} · {libraryQueue[0].album}</div><input type="range" min="0" max={padPlayback[0]?.duration || libraryQueue[0].duration || 0} value={Math.min(padPlayback[0]?.currentTime || 0, padPlayback[0]?.duration || 0)} onChange={(event) => onSeekPad(0, Number(event.target.value))} disabled={!padPlayback[0]?.duration} className="slider-fancy mt-6 w-full" aria-label="Progreso de reproducción" /><div className="mt-5 flex items-center justify-center gap-4"><button type="button" onClick={playPreviousTrack} className="p-2 text-[#a6b3bf]" title="Anterior">◀</button><button type="button" onClick={() => padPlayback[0]?.isPlaying ? onPausePad(0) : onResumePad(0)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0b1017] hover:bg-cyan-200" title="Reproducir o pausar">{padPlayback[0]?.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button type="button" onClick={playNextTrack} className="p-2 text-[#a6b3bf]" title="Siguiente">▶</button><button type="button" onClick={() => setShowLyrics((visible) => !visible)} className={`rounded-md border px-3 py-2 text-[9px] font-bold uppercase tracking-wider ${showLyrics ? 'border-cyan-400 text-cyan-300' : 'border-white/10 text-[#94a3af]'}`}>Letras</button></div>{showLyrics && <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-[10px] text-[#8997a4]">{libraryQueue[0].lyrics || 'No hay letras integradas disponibles para este archivo local.'}</div>}</div></div>}
    </div>
  );

  const renderPadPanel = (panelIndex: number, playback: PadPlaybackState) => (
    <div className="rounded-lg border border-[#2a3038] bg-[#0a0c10] p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 size={13} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#c7ced8]">Panel {panelIndex + 1}</span>
        </div>
        <span className="text-[9px] font-mono text-[#5d6570]">15 disparadores</span>
      </div>

      {playback.isPlaying && (
        <div className="mt-2 border-t border-[#252c35] pt-2">
          <div className="rounded-md border border-[#2a3038] bg-[#121519] p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileAudio size={13} className="shrink-0 text-cyan-400" />
              <span className="truncate text-[10px] font-mono text-[#9aa3af]">{playback.fileName ?? 'Selecciona un pad para reproducir'}</span>
            </div>
            <span className="shrink-0 text-[9px] font-mono text-[#5d6570]">{Math.floor(playback.currentTime / 60)}:{Math.floor(playback.currentTime % 60).toString().padStart(2, '0')} / {Math.floor(playback.duration / 60)}:{Math.floor(playback.duration % 60).toString().padStart(2, '0')}</span>
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
        <div className="mt-2 flex items-center gap-2">
          <Volume2 size={13} className="shrink-0 text-[#7f8b98]" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={playback.volume}
            onChange={(event) => onSetPadVolume(panelIndex, Number(event.target.value))}
            className="slider-fancy min-w-0 flex-1"
            aria-label={`Volumen del Panel ${panelIndex + 1}`}
          />
          <span className="w-8 text-right text-[9px] font-mono text-[#7f8b98]">{Math.round(playback.volume * 100)}%</span>
        </div>

          <div className="mt-2 flex items-center justify-center gap-2">
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

              const preferredFile = pads[panelIndex].find((padFile) => padFile?.name === playback.fileName)
                ?? pads[panelIndex].find(Boolean);

              if (preferredFile) {
                onPlayPad(preferredFile, panelIndex);
                return;
              }

              padInputRefs.current[panelIndex * 15]?.click();
            }}
            disabled={!playback.fileName && !pads[panelIndex].some(Boolean)}
            className="flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {playback.isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {playback.isPlaying ? 'Pausa' : playback.isPaused ? 'Reanudar' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => onStopPad(panelIndex)}
            disabled={!playback.fileName}
            className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Square size={11} fill="currentColor" />
            Detener
          </button>
        </div>
          </div>
        </div>
      )}

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
                id={`pad-button-${menuId}`}
                ref={(element) => {
                  padButtonRefs.current[panelIndex * 15 + padIndex] = element;
                }}
                type="button"
                onClick={() => handlePadClick(panelIndex, padIndex)}
                onPointerDown={(event) => handlePadPointerDown(panelIndex, padIndex, event)}
                onPointerMove={(event) => handlePadPointerMove(panelIndex, padIndex, event)}
                onPointerUp={handlePadPointerUp}
                onPointerLeave={handlePadPointerUp}
                onPointerCancel={handlePadPointerUp}
                onContextMenu={(event) => {
                  event.preventDefault();
                  const button = padButtonRefs.current[panelIndex * 15 + padIndex];
                  const rect = button?.getBoundingClientRect();
                  const menuWidth = 176;
                  const menuHeight = 132;
                  const padding = 12;
                  const nextLeft = rect
                    ? clamp(rect.left + rect.width / 2 - menuWidth / 2, padding, window.innerWidth - menuWidth - padding)
                    : window.innerWidth / 2 - menuWidth / 2;
                  const nextTop = rect
                    ? clamp(rect.top + rect.height / 2 - menuHeight / 2, padding, window.innerHeight - menuHeight - padding)
                    : window.innerHeight / 2 - menuHeight / 2;
                  setPadMenuPosition({ top: nextTop, left: nextLeft });
                  setOpenPadMenu(menuId);
                }}
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
                <div
                  id={`pad-menu-${menuId}`}
                  className="fixed z-[80] w-44 rounded-lg border-2 border-[#556170] bg-[#20252d] p-2 shadow-2xl"
                  style={{ top: `${padMenuPosition.top}px`, left: `${padMenuPosition.left}px` }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      padInputRefs.current[panelIndex * 15 + padIndex]?.click();
                      closePadMenu();
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-[#e8ecf1] hover:bg-emerald-400/20 hover:text-emerald-200"
                  >
                    <Upload size={16} />
                    Cargar audio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPads((current) => current.map((panel, currentPanelIndex) => currentPanelIndex === panelIndex ? panel.map((pad, currentPadIndex) => currentPadIndex === padIndex ? null : pad) : panel));
                      void deletePad(panelIndex, padIndex);
                      closePadMenu();
                    }}
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            onClick={() => setShowPads((visible) => {
              const nextVisible = !visible;
              if (!nextVisible) {
                setActivePanel(0);
                setPadsFullscreen(false);
                return false;
              }
              setActivePanel(0);
              setPadsFullscreen(true);
              return true;
            })}
            className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 ${showPads ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-400/15 via-cyan-400/5 to-[#0f1720] shadow-[0_0_24px_rgba(34,211,238,0.12)]' : 'border-[#2a3038] bg-[#0d1117] hover:border-cyan-400/40 hover:bg-[#111a22]'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-1.5">
              <AudioLines size={18} className={showPads ? 'text-cyan-400' : 'text-[#5d6570]'} />
              <span className="text-[9px] uppercase tracking-wider text-[#dfe7f0]">Musicalizador Live</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 ${showLibrary ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-400/15 via-cyan-400/5 to-[#0f1720] shadow-[0_0_24px_rgba(34,211,238,0.12)]' : 'border-[#2a3038] bg-[#0d1117] hover:border-cyan-400/40 hover:bg-[#111a22]'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-1.5">
              <Library size={18} className={showLibrary ? 'text-cyan-400' : 'text-[#5d6570]'} />
              <span className="text-[9px] uppercase tracking-wider text-[#dfe7f0]">Biblioteca musical</span>
            </div>
          </button>

          <button
            onClick={() => {
              if (isPlaying && sourceType === 'mic') {
                onStop();
                setShowLineInSettings(false);
                setLineInFullscreen(false);
                return;
              }

              const nextVisible = !showLineInSettings;
              setShowLineInSettings(nextVisible);
              setLineInFullscreen(nextVisible);

              if (nextVisible) {
                onStartMic(state);
              }
            }}
            className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 ${isPlaying && sourceType === 'mic' ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-400/15 via-cyan-400/5 to-[#0f1720] shadow-[0_0_24px_rgba(34,211,238,0.12)]' : 'border-[#2a3038] bg-[#0d1117] hover:border-cyan-400/40 hover:bg-[#111a22]'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-1.5">
              <Mic size={18} className={isPlaying && sourceType === 'mic' ? 'text-cyan-400' : 'text-[#5d6570]'} />
              <span className="text-[9px] uppercase tracking-wider text-[#dfe7f0]">Entrada Line In</span>
            </div>
          </button>

          <button
            onClick={() => isPlaying && sourceType === 'tone' ? onStop() : onStartTone(state)}
            className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 ${isPlaying && sourceType === 'tone' ? 'border-violet-400/60 bg-gradient-to-br from-violet-400/15 via-violet-400/5 to-[#0f1720] shadow-[0_0_24px_rgba(168,85,247,0.12)]' : 'border-[#2a3038] bg-[#0d1117] hover:border-violet-400/40 hover:bg-[#181521]'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-1.5">
              <Radio size={18} className={isPlaying && sourceType === 'tone' ? 'text-violet-400' : 'text-[#5d6570]'} />
              <span className="text-[9px] uppercase tracking-wider text-[#dfe7f0]">Tono de Prueba</span>
            </div>
          </button>
        </div>

        {showLineInSettings && (
          <div className={`${lineInFullscreen ? 'fixed inset-0 z-50 overflow-hidden bg-[#070b10]' : 'rounded-lg border border-cyan-400/20 bg-cyan-400/5'} p-3`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-cyan-300">Dispositivo de entrada</span>
                <span className="block truncate text-[9px] text-[#7f8b98]">Selecciona la interfaz USB o Line In del teléfono</span>
              </div>
              <button type="button" onClick={() => setLineInFullscreen((visible) => !visible)} className="rounded-md border border-[#353c46] bg-[#121519] p-1.5 text-[#9aa3af] transition hover:text-white" title={lineInFullscreen ? 'Salir de pantalla completa' : 'Abrir pantalla completa'}>
                {lineInFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={selectedInputDeviceId}
                onChange={(event) => onSelectedInputDeviceChange(event.target.value)}
                className="min-w-0 rounded border border-[#2a3038] bg-[#121519] px-2 py-1.5 text-[10px] text-[#d5dbe3] outline-none focus:border-cyan-400/60 sm:max-w-[260px]"
                aria-label="Dispositivo de entrada de audio"
              >
                <option value="">Entrada predeterminada del sistema</option>
                {audioInputDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
              </select>
              <button type="button" onClick={onRefreshAudioInputDevices} title="Actualizar dispositivos de entrada" className="self-end rounded border border-cyan-400/30 bg-cyan-400/10 p-1.5 text-cyan-300 hover:bg-cyan-400/20 sm:self-auto">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        )}

        {showPads && (
          <div className={`${padsFullscreen ? 'fixed inset-0 z-50 overflow-hidden bg-[#070b10]' : 'space-y-3'}`}>
            {padsFullscreen && (
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Music2 size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#c7ced8]">Musicalizador Live</span>
                </div>
                <button type="button" onClick={() => setPadsFullscreen(false)} className="rounded-md border border-[#353c46] bg-[#121519] p-1.5 text-[#9aa3af] transition hover:text-white" title="Salir de pantalla completa">
                  <Minimize2 size={12} />
                </button>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-2 ${padsFullscreen ? 'mx-auto max-w-3xl' : ''}`}>
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

            <div className={padsFullscreen ? 'pt-2' : ''}>
              {renderPadPanel(activePanel, padPlayback[activePanel])}
            </div>
          </div>
        )}

        {isPlaying && (
          <div className="flex items-center justify-between bg-[#0a0c10] rounded-lg px-3 py-2 border border-[#2a3038]">
            <div className="flex min-w-0 items-center gap-2">
              <FileAudio size={14} className="flex-shrink-0 text-cyan-400" />
              <span className="truncate text-[10px] font-mono text-[#9aa3af]">
                {sourceType === 'mic' ? 'Entrada Line In' : sourceType === 'tone' ? 'Tono de prueba 440Hz' : fileName ?? 'Pad activo'}
              </span>
            </div>
            <button
              onClick={onStop}
              className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/20 px-2 py-1 text-red-400 transition-colors hover:bg-red-500/30"
            >
              <Square size={10} fill="currentColor" />
              <span className="text-[9px] uppercase font-bold tracking-wider">Detener</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="text-center">
            <div className="mb-1 text-[9px] text-[#5d6570] uppercase">Entrada L</div>
            <div className="font-mono text-lg font-bold" style={{ color: levels.inputL > -6 ? '#ef4444' : levels.inputL > -15 ? '#f59e0b' : '#22d3ee' }}>
              {levels.inputL <= -60 ? '-∞' : levels.inputL.toFixed(1)}
            </div>
            <div className="text-[8px] text-[#5d6570]">dB</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-[9px] text-[#5d6570] uppercase">Entrada R</div>
            <div className="font-mono text-lg font-bold" style={{ color: levels.inputR > -6 ? '#ef4444' : levels.inputR > -15 ? '#f59e0b' : '#22d3ee' }}>
              {levels.inputR <= -60 ? '-∞' : levels.inputR.toFixed(1)}
            </div>
            <div className="text-[8px] text-[#5d6570]">dB</div>
          </div>
        </div>
      </div>
      {showLibrary && renderLibrary()}
    </div>
  );
}
