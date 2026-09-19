import { Directory, Filesystem } from '@capacitor/filesystem';
import { parseBlob } from 'music-metadata-browser';

const DATABASE_NAME = 'viento-sur-fm-library';
const STORE_NAME = 'tracks';
const DATABASE_VERSION = 2;

export interface MusicTrack {
  id: string;
  name: string;
  file: File;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  coverUrl?: string;
  lyrics?: string;
  source: 'local' | 'android';
  folderPath?: string;
}

export interface MusicPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

interface StoredTrack {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  coverBlob?: Blob;
  source: MusicTrack['source'];
  folderPath?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!database.objectStoreNames.contains('playlists')) database.createObjectStore('playlists', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function recordToTrack(record: StoredTrack): MusicTrack {
  const file = new File([record.blob], record.name, { type: record.type || record.blob.type || 'audio/mpeg' });
  return {
    id: record.id,
    name: record.name,
    file,
    artist: record.artist,
    album: record.album,
    year: record.year,
    genre: record.genre,
    duration: record.duration,
    coverUrl: record.coverBlob ? URL.createObjectURL(record.coverBlob) : undefined,
    source: record.source,
    folderPath: record.folderPath,
  };
}

export async function readTrackMetadata(file: File, source: MusicTrack['source'] = 'local', folderPath?: string): Promise<MusicTrack> {
  const fallbackName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  try {
    const metadata = await parseBlob(file);
    const common = metadata.common;
    const cover = common.picture?.[0];
    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: common.title || fallbackName,
      file,
      artist: common.artist || 'Artista desconocido',
      album: common.album || 'Álbum desconocido',
      year: common.year,
      genre: common.genre?.[0],
      duration: metadata.format.duration || 0,
      coverUrl: cover ? URL.createObjectURL(new Blob([cover.data], { type: cover.format })) : undefined,
      source,
      folderPath,
    };
  } catch {
    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: fallbackName || file.name,
      file,
      artist: 'Artista desconocido',
      album: 'Biblioteca local',
      duration: 0,
      source,
      folderPath,
    };
  }
}

export async function saveTrack(track: MusicTrack): Promise<void> {
  const database = await openDatabase();
  const coverResponse = track.coverUrl ? await fetch(track.coverUrl) : null;
  const coverBlob = coverResponse ? await coverResponse.blob() : undefined;
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({
      id: track.id,
      name: track.file.name,
      type: track.file.type,
      blob: track.file,
      artist: track.artist,
      album: track.album,
      year: track.year,
      genre: track.genre,
      duration: track.duration,
      coverBlob,
      source: track.source,
      folderPath: track.folderPath,
    } satisfies StoredTrack);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function loadTracks(): Promise<MusicTrack[]> {
  const database = await openDatabase();
  const records = await new Promise<StoredTrack[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredTrack[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return records.map(recordToTrack);
}

export async function deleteTrack(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function loadPlaylists(): Promise<MusicPlaylist[]> {
  const database = await openDatabase();
  const playlists = await new Promise<MusicPlaylist[]>((resolve, reject) => {
    const request = database.transaction('playlists', 'readonly').objectStore('playlists').getAll();
    request.onsuccess = () => resolve(request.result as MusicPlaylist[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return playlists.sort((first, second) => second.updatedAt - first.updatedAt);
}

export async function savePlaylist(playlist: MusicPlaylist): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction('playlists', 'readwrite').objectStore('playlists').put(playlist);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function deletePlaylist(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction('playlists', 'readwrite').objectStore('playlists').delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

function base64ToFile(data: string, name: string, mimeType: string): File {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], name, { type: mimeType });
}

export async function scanAndroidMusicFolder(): Promise<MusicTrack[]> {
  const tracks: MusicTrack[] = [];
  const scanDirectory = async (path: string): Promise<void> => {
    const result = await Filesystem.readdir({ path, directory: Directory.ExternalStorage });
    for (const entry of result.files) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.type === 'directory') {
        await scanDirectory(entryPath);
        continue;
      }
      if (!/\.(mp3|wav|flac|m4a|aac|ogg)$/i.test(entry.name)) continue;
      const content = await Filesystem.readFile({ path: entry.uri || entryPath, directory: Directory.ExternalStorage });
      if (typeof content.data !== 'string') continue;
      const mimeType = entry.name.toLowerCase().endsWith('.wav') ? 'audio/wav' : entry.name.toLowerCase().endsWith('.flac') ? 'audio/flac' : 'audio/mpeg';
      const file = base64ToFile(content.data, entry.name, mimeType);
      const track = await readTrackMetadata(file, 'android', path.replace(/^Music\/?/, '') || 'Music');
      await saveTrack(track);
      tracks.push(track);
    }
  };
  await scanDirectory('Music');
  return tracks;
}
