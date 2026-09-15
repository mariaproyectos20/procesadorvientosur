import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Mic, Radio, Square, Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Volume2, VolumeX, Repeat, Shuffle, FileAudio, Music2, AudioLines, Maximize2, Minimize2, Library, RefreshCw, ListPlus, MoreVertical, Trash2, ArrowUp, ArrowDown, Search, Pencil, X, Disc3 } from 'lucide-react';
import type { ProcessorState, AudioSourceType } from '../types';
import type { AudioInputDevice, AudioLevels, LibraryPlaybackState, PadPlaybackState } from '../useAudioEngine';
import { deletePad, loadStoredPads, savePad } from '../padStorage';
import { deleteMusicPlaylist, deleteMusicTrack, loadMusicPlaylists, loadMusicTracks, saveMusicPlaylist, saveMusicTrack, syncPhoneMusicFolder, type MusicPlaylist, type MusicTrack } from '../musicLibrary';

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
  audioInputDevices,
  selectedInputDeviceId,
  onSelectedInputDeviceChange,
  onRefreshAudioInputDevices,
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
  const [showLibrary, setShowLibrary] = useState(false);
  const [showLineInSettings, setShowLineInSettings] = useState(false);
  const trackLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressTrackClickRef = useRef(false);
  const trackPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const [activePanel, setActivePanel] = useState(0);
  const [musicSearch, setMusicSearch] = useState('');
  const [repeatLibrary, setRepeatLibrary] = useState(false);
  const [shuffleLibrary, setShuffleLibrary] = useState(false);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [musicPlaylists, setMusicPlaylists] = useState<MusicPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'favorites' | 'recent'>('all');
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>([]);
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>([]);
  const [queuedTrackIds, setQueuedTrackIds] = useState<string[]>([]);
  const [openTrackMenu, setOpenTrackMenu] = useState<string | null>(null);
  const [trackMenuPosition, setTrackMenuPosition] = useState({ top: 0, left: 0 });
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

    try {
      const savedFavorites = JSON.parse(localStorage.getItem('viento-sur-fm-favorites') ?? '[]') as string[];
      const savedRecent = JSON.parse(localStorage.getItem('viento-sur-fm-recent') ?? '[]') as string[];
      const savedQueue = JSON.parse(localStorage.getItem('viento-sur-fm-queue') ?? '[]') as string[];
      setFavoriteTrackIds(Array.isArray(savedFavorites) ? savedFavorites : []);
      setRecentTrackIds(Array.isArray(savedRecent) ? savedRecent : []);
      setQueuedTrackIds(Array.isArray(savedQueue) ? savedQueue : []);
    } catch {
      setFavoriteTrackIds([]);
      setRecentTrackIds([]);
      setQueuedTrackIds([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('viento-sur-fm-favorites', JSON.stringify(favoriteTrackIds));
  }, [favoriteTrackIds]);

  useEffect(() => {
    localStorage.setItem('viento-sur-fm-recent', JSON.stringify(recentTrackIds));
  }, [recentTrackIds]);

  useEffect(() => {
    localStorage.setItem('viento-sur-fm-queue', JSON.stringify(queuedTrackIds));
  }, [queuedTrackIds]);

  const formatTime = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const parseTrackMetadata = (trackName: string) => {
    const cleanName = trackName.replace(/\.[^/.]+$/, '').trim();
    if (!cleanName) return { artist: 'Desconocido', title: 'Sin título' };

    const separator = /[-–—]/;
    const parts = cleanName.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        artist: parts[0],
        title: parts.slice(1).join(' - '),
      };
    }

    return {
      artist: 'Desconocido',
      title: cleanName,
    };
  };

  const currentTrackMeta = libraryPlayback.fileName ? parseTrackMetadata(libraryPlayback.fileName) : { artist: 'Desconocido', title: 'Sin reproducción' };
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
    setQueuedTrackIds((current) => current.filter((id) => id !== trackId));
    setFavoriteTrackIds((current) => current.filter((id) => id !== trackId));
    setRecentTrackIds((current) => current.filter((id) => id !== trackId));
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

  const openTrackMenuAt = (trackId: string, bounds: DOMRect) => {
    const menuWidth = 176;
    const menuHeight = 240;
    const gap = 6;
    const padding = 12;
    const canOpenBelow = bounds.bottom + gap + menuHeight <= window.innerHeight - padding;
    const nextTop = canOpenBelow
      ? bounds.bottom + gap
      : Math.max(padding, bounds.top - menuHeight - gap);
    const nextLeft = clamp(bounds.right - menuWidth, padding, window.innerWidth - menuWidth - padding);

    setTrackMenuPosition({ top: nextTop, left: nextLeft });
    setOpenTrackMenu(trackId);
  };

  const handleTrackPointerDown = (trackId: string, event?: React.PointerEvent<HTMLButtonElement>) => {
    clearTrackPressTimer();
    suppressTrackClickRef.current = false;
    trackPressStartRef.current = event ? { x: event.clientX, y: event.clientY } : null;

    if (event && event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    trackLongPressTimerRef.current = setTimeout(() => {
      const trigger = document.getElementById(`track-button-${trackId}`);
      const rect = trigger?.getBoundingClientRect();

      suppressTrackClickRef.current = true;
      if (rect) openTrackMenuAt(trackId, rect);
      setTrackPressTimer(null);
    }, 450);
  };

  const handleTrackPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!trackPressStartRef.current) return;

    const deltaX = Math.abs(event.clientX - trackPressStartRef.current.x);
    const deltaY = Math.abs(event.clientY - trackPressStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      if (trackLongPressTimerRef.current) {
        clearTimeout(trackLongPressTimerRef.current);
        trackLongPressTimerRef.current = null;
      }
    }
  };

  const handleTrackPointerUp = () => {
    trackPressStartRef.current = null;
    if (trackLongPressTimerRef.current) {
      clearTimeout(trackLongPressTimerRef.current);
      trackLongPressTimerRef.current = null;
    }
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
    .filter((track) => {
      const searchableText = `${track.name} ${track.sourcePath ?? ''}`.toLowerCase();
      const matchesSearch = searchableText.includes(musicSearch.trim().toLowerCase());
      if (!matchesSearch) return false;
      if (libraryFilter === 'favorites') return favoriteTrackIds.includes(track.id);
      if (libraryFilter === 'recent') return recentTrackIds.includes(track.id);
      return true;
    })
    .sort((a, b) => {
      const aRecentIndex = recentTrackIds.indexOf(a.id);
      const bRecentIndex = recentTrackIds.indexOf(b.id);
      if (libraryFilter === 'recent' && (aRecentIndex !== -1 || bRecentIndex !== -1)) {
        if (aRecentIndex === -1) return 1;
        if (bRecentIndex === -1) return -1;
        return aRecentIndex - bRecentIndex;
      }
      return 0;
    });

  const markTrackAsPlayed = useCallback((track: MusicTrack) => {
    setRecentTrackIds((current) => [track.id, ...current.filter((id) => id !== track.id)].slice(0, 12));
  }, []);

  const handleTrackPlay = useCallback((track: MusicTrack) => {
    markTrackAsPlayed(track);
    onPlayLibrary(track.file);
  }, [markTrackAsPlayed, onPlayLibrary]);

  const queuedTracks = queuedTrackIds
    .map((trackId) => musicTracks.find((track) => track.id === trackId))
    .filter((track): track is MusicTrack => Boolean(track));

  const addTrackToQueue = (trackId: string) => {
    setQueuedTrackIds((current) => current.includes(trackId) ? current : [...current, trackId]);
    setOpenTrackMenu(null);
  };

  const removeTrackFromQueue = (trackId: string) => {
    setQueuedTrackIds((current) => current.filter((id) => id !== trackId));
  };

  const moveQueuedTrack = (trackId: string, direction: -1 | 1) => {
    setQueuedTrackIds((current) => {
      const index = current.indexOf(trackId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const clearQueue = () => setQueuedTrackIds([]);

  const playAdjacentTrack = useCallback((direction: -1 | 1) => {
    if (direction === 1 && queuedTracks.length) {
      const nextTrack = queuedTracks[0];
      setQueuedTrackIds((current) => current.slice(1));
      handleTrackPlay(nextTrack);
      return;
    }

    const currentIndex = visibleMusicTracks.findIndex((track) => track.name === libraryPlayback.fileName);
    if (currentIndex < 0 || !visibleMusicTracks.length) return;
    const nextIndex = shuffleLibrary
      ? Math.floor(Math.random() * visibleMusicTracks.length)
      : currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= visibleMusicTracks.length) return;
    handleTrackPlay(visibleMusicTracks[nextIndex]);
  }, [libraryPlayback.fileName, handleTrackPlay, queuedTracks, shuffleLibrary, visibleMusicTracks]);

  useEffect(() => {
    if (!libraryPlayback.ended || !libraryPlayback.fileName) return;
    if (repeatLibrary) {
      const currentTrack = musicTracks.find((track) => track.name === libraryPlayback.fileName);
      if (currentTrack) {
        markTrackAsPlayed(currentTrack);
        onPlayLibrary(currentTrack.file);
      }
      return;
    }
    playAdjacentTrack(1);
  }, [libraryPlayback.ended, libraryPlayback.fileName, markTrackAsPlayed, musicTracks, onPlayLibrary, playAdjacentTrack, repeatLibrary]);

  useEffect(() => {
    if (!openTrackMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menuElement = document.getElementById(`track-menu-${openTrackMenu}`);
      const triggerElement = document.getElementById(`track-button-${openTrackMenu}`);
      const target = event.target as Node | null;

      if (!menuElement || !triggerElement) {
        setOpenTrackMenu(null);
        return;
      }

      const clickedInsideMenu = menuElement.contains(target);
      const clickedOnTrigger = triggerElement.contains(target);

      if (!clickedInsideMenu && !clickedOnTrigger) {
        setOpenTrackMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openTrackMenu]);

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setShowPads((visible) => {
              if (!visible) {
                setActivePanel(0);
                setShowLibrary(false);
              }
              return !visible;
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
            onClick={() => setShowLibrary((visible) => {
              if (!visible) setShowPads(false);
              return !visible;
            })}
            className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 ${showLibrary ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-400/15 via-emerald-400/5 to-[#0f1720] shadow-[0_0_24px_rgba(16,185,129,0.12)]' : 'border-[#2a3038] bg-[#0d1117] hover:border-emerald-400/40 hover:bg-[#101b1a]'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-1.5">
              <Library size={18} className={showLibrary ? 'text-emerald-400' : 'text-[#5d6570]'} />
              <span className="text-[9px] uppercase tracking-wider text-[#dfe7f0]">Biblioteca Musical</span>
            </div>
          </button>
          <button
            onClick={() => {
              if (isPlaying && sourceType === 'mic') {
                onStop();
                setShowLineInSettings(false);
                return;
              }
              setShowLineInSettings(true);
              onStartMic(state);
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

        {showLineInSettings && <div className="flex flex-col gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2.5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-cyan-300">Dispositivo de entrada</span>
            <span className="block truncate text-[9px] text-[#7f8b98]">Selecciona la interfaz USB o Line In del teléfono</span>
          </div>
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
        </div>}

        {showLibrary && <div className="rounded-2xl border border-[#2a3038] bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_30%),_#0a0c10] p-3 shadow-[0_10px_30px_rgba(2,6,23,0.45)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
                <Library size={14} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#c7ced8]">Biblioteca Musical</span>
                <span className="block text-[9px] text-[#5d6570]">{musicTracks.length} canciones · reproductor local</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => musicInputRef.current?.click()} className="rounded-md border border-cyan-400/40 bg-cyan-400/10 p-1.5 text-cyan-300 transition hover:bg-cyan-400/20" title="Importar canciones"><Upload size={12} /></button>
              <button type="button" onClick={handleSyncMusicFolder} className="rounded-md border border-emerald-400/40 bg-emerald-400/10 p-1.5 text-emerald-300 transition hover:bg-emerald-400/20" title="Sincronizar carpeta Music"><RefreshCw size={12} /></button>
              <button type="button" onClick={handleCreatePlaylist} className="rounded-md border border-[#353c46] bg-[#121519] p-1.5 text-[#9aa3af] transition hover:text-white" title="Crear lista"><ListPlus size={12} /></button>
            </div>
          </div>
          <input ref={musicInputRef} type="file" accept="audio/*" multiple onChange={handleMusicFiles} className="hidden" />
          <div className="relative z-30 mb-2 flex flex-col gap-2 pb-1">
            <div className="flex gap-2 overflow-x-auto overflow-y-visible">
              <button type="button" onClick={() => setLibraryFilter('all')} className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider transition ${libraryFilter === 'all' ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-300' : 'border-[#27313b] bg-[#121519] text-[#7f8b98]'}`}>Todos</button>
              <button type="button" onClick={() => setLibraryFilter('favorites')} className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider transition ${libraryFilter === 'favorites' ? 'border-amber-400/50 bg-amber-400/15 text-amber-300' : 'border-[#27313b] bg-[#121519] text-[#7f8b98]'}`}>Favoritos</button>
              <button type="button" onClick={() => setLibraryFilter('recent')} className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider transition ${libraryFilter === 'recent' ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300' : 'border-[#27313b] bg-[#121519] text-[#7f8b98]'}`}>Recientes</button>
            </div>
            <div className="flex gap-2 overflow-x-auto overflow-y-visible">
              <button type="button" onClick={() => setActivePlaylistId(null)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider transition ${!activePlaylistId ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-300' : 'border-[#27313b] bg-[#121519] text-[#7f8b98]'}`}>Toda la música</button>
              {musicPlaylists.map((playlist) => (
                <div key={playlist.id} className="relative flex shrink-0 items-center overflow-hidden rounded-full border border-[#27313b] bg-[#121519]">
                  <button type="button" onClick={() => { setActivePlaylistId(playlist.id); setOpenPlaylistMenu(null); }} className={`px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${activePlaylistId === playlist.id ? 'bg-cyan-400/15 text-cyan-300' : 'text-[#7f8b98]'}`}>{playlist.name}</button>
                  <button type="button" onClick={(event) => togglePlaylistMenu(playlist.id, event)} title={`Opciones de ${playlist.name}`} className="border-l border-[#27313b] px-1.5 py-1 text-[#5d6570] hover:text-cyan-300"><MoreVertical size={11} /></button>
                </div>
              ))}
            </div>
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
                  <span className="block truncate text-xs font-bold text-[#e8ecf1]">{currentTrackMeta.title}</span>
                  <span className="block truncate text-[9px] text-[#7f8b98]">{currentTrackMeta.artist} · VIENTO SUR FM</span>
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
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#7f8b98]">Cola de reproducción</span>
              <span className="rounded-full bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-mono text-cyan-300">{queuedTracks.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#5d6570]">{visibleMusicTracks.length} biblioteca</span>
              <button type="button" onClick={clearQueue} disabled={!queuedTracks.length} className="text-[8px] font-semibold uppercase tracking-wider text-[#687482] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40">Vaciar</button>
            </div>
          </div>
          {queuedTracks.length > 0 && <div className="mb-2 space-y-1 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-1.5">
            {queuedTracks.map((track, index) => {
              const meta = parseTrackMetadata(track.name);
              return <div key={track.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/5">
                <span className="w-4 text-center text-[8px] font-mono text-cyan-300">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[9px] text-[#dfe7f0]">{meta.title}</span>
                  <span className="block truncate text-[8px] text-[#687482]">{meta.artist}</span>
                </div>
                <button type="button" onClick={() => moveQueuedTrack(track.id, -1)} disabled={index === 0} title="Subir en la cola" className="p-1 text-[#7f8b98] hover:text-cyan-300 disabled:opacity-30"><ArrowUp size={10} /></button>
                <button type="button" onClick={() => moveQueuedTrack(track.id, 1)} disabled={index === queuedTracks.length - 1} title="Bajar en la cola" className="p-1 text-[#7f8b98] hover:text-cyan-300 disabled:opacity-30"><ArrowDown size={10} /></button>
                <button type="button" onClick={() => removeTrackFromQueue(track.id)} title="Quitar de la cola" className="p-1 text-[#7f8b98] hover:text-red-300"><X size={10} /></button>
              </div>;
            })}
          </div>}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {visibleMusicTracks.map((track) => {
              const meta = parseTrackMetadata(track.name);
              const isFavorite = favoriteTrackIds.includes(track.id);

              return (
                <div key={track.id} className={`relative flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all ${track.name === libraryPlayback.fileName ? 'border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.08)]' : 'border-[#1f2730] bg-[#121519] hover:border-[#364754] hover:bg-[#141c24]'}`}>
                  <span className="w-5 text-center text-[9px] font-mono text-[#5d6570]">{String(musicTracks.indexOf(track) + 1).padStart(2, '0')}</span>
                  <button
                    id={`track-button-${track.id}`}
                    type="button"
                    onClick={() => {
                      if (suppressTrackClickRef.current) {
                        suppressTrackClickRef.current = false;
                        return;
                      }
                      handleTrackPlay(track);
                    }}
                    onPointerDown={(event) => handleTrackPointerDown(track.id, event)}
                    onPointerMove={handleTrackPointerMove}
                    onPointerUp={handleTrackPointerUp}
                    onPointerLeave={handleTrackPointerUp}
                    onPointerCancel={handleTrackPointerUp}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      const trigger = document.getElementById(`track-button-${track.id}`);
                      const rect = trigger?.getBoundingClientRect();
                      suppressTrackClickRef.current = true;
                      if (rect) openTrackMenuAt(track.id, rect);
                      setTrackPressTimer(null);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-cyan-300"
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${track.name === libraryPlayback.fileName ? 'bg-cyan-300 text-[#07131a]' : 'bg-[#202a33] text-cyan-400'}`}>{track.name === libraryPlayback.fileName && libraryPlayback.isPlaying ? <Pause size={9} /> : <Play size={9} fill="currentColor" />}</span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] text-[#e8ecf1]">{meta.title}</span>
                      <span className="block truncate text-[8px] text-[#6d7782]">{meta.artist}{track.sourcePath ? ` · ${track.sourcePath.replace(/^Music\//, '')}` : ''}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFavoriteTrackIds((current) => current.includes(track.id) ? current.filter((id) => id !== track.id) : [...current, track.id])}
                    title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    className={`rounded-md border p-1 transition ${isFavorite ? 'border-amber-400/50 bg-amber-400/15 text-amber-300' : 'border-[#2a3038] bg-[#0d1117] text-[#5d6570] hover:border-amber-400/40 hover:text-amber-300'}`}
                  >
                    {isFavorite ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      if (openTrackMenu === track.id) {
                        setOpenTrackMenu(null);
                        return;
                      }
                      openTrackMenuAt(track.id, event.currentTarget.getBoundingClientRect());
                    }}
                    title="Opciones del track"
                    className="rounded-md border border-[#2a3038] bg-[#0d1117] p-1 text-[#5d6570] transition hover:border-cyan-400/40 hover:text-cyan-300"
                  >
                    <MoreVertical size={12} />
                  </button>
                  {openTrackMenu === track.id && <div id={`track-menu-${track.id}`} className="fixed z-[80] w-44 rounded-md border border-[#353c46] bg-[#20252d] p-1 shadow-xl" style={{ top: `${trackMenuPosition.top}px`, left: `${trackMenuPosition.left}px` }}>
                    <button type="button" onClick={() => addTrackToQueue(track.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[9px] text-cyan-300 hover:bg-cyan-400/15"><ListPlus size={11} /> Añadir a la cola</button>
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
              );
            })}
            {!musicTracks.length && <p className="py-2 text-center text-[9px] text-[#5d6570]">Importa canciones o sincroniza la carpeta Music.</p>}
            {musicTracks.length > 0 && !visibleMusicTracks.length && <p className="py-2 text-center text-[9px] text-[#5d6570]">No se encontraron canciones.</p>}
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
                {sourceType === 'file' ? fileName ?? 'Archivo de audio' : sourceType === 'mic' ? 'Entrada Line In' : 'Tono de prueba 440Hz'}
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
