import { Directory, Filesystem } from '@capacitor/filesystem';

const DATABASE_NAME = 'viento-sur-fm';
const TRACK_STORE = 'music-library';
const PLAYLIST_STORE = 'music-playlists';

export interface MusicTrack {
  id: string;
  name: string;
  type: string;
  file: File;
  sourcePath?: string;
}

export interface MusicPlaylist {
  id: string;
  name: string;
  trackIds: string[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TRACK_STORE)) database.createObjectStore(TRACK_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(PLAYLIST_STORE)) database.createObjectStore(PLAYLIST_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadMusicTracks(): Promise<MusicTrack[]> {
  const database = await openDatabase();
  const records = await new Promise<Array<{ id: string; name: string; type: string; blob: Blob; sourcePath?: string }>>((resolve, reject) => {
    const request = database.transaction(TRACK_STORE, 'readonly').objectStore(TRACK_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return records.map((record) => ({ id: record.id, name: record.name, type: record.type, sourcePath: record.sourcePath, file: new File([record.blob], record.name, { type: record.type || record.blob.type }) }));
}

export async function saveMusicTrack(file: File, sourcePath?: string): Promise<MusicTrack> {
  const track = { id: `${sourcePath ?? file.name}-${file.size}-${file.lastModified}`, name: file.name, type: file.type, sourcePath, file };
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(TRACK_STORE, 'readwrite').objectStore(TRACK_STORE).put({ ...track, blob: file });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
  return track;
}

export async function deleteMusicTrack(trackId: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(TRACK_STORE, 'readwrite').objectStore(TRACK_STORE).delete(trackId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function loadMusicPlaylists(): Promise<MusicPlaylist[]> {
  const database = await openDatabase();
  const playlists = await new Promise<MusicPlaylist[]>((resolve, reject) => {
    const request = database.transaction(PLAYLIST_STORE, 'readonly').objectStore(PLAYLIST_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return playlists;
}

export async function saveMusicPlaylist(playlist: MusicPlaylist): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(PLAYLIST_STORE, 'readwrite').objectStore(PLAYLIST_STORE).put(playlist);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function deleteMusicPlaylist(playlistId: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(PLAYLIST_STORE, 'readwrite').objectStore(PLAYLIST_STORE).delete(playlistId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function syncPhoneMusicFolder(): Promise<MusicTrack[]> {
  const imported: MusicTrack[] = [];

  const scanDirectory = async (path: string): Promise<void> => {
    const result = await Filesystem.readdir({ path, directory: Directory.ExternalStorage });
    for (const entry of result.files) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.type === 'directory') {
        try {
          await scanDirectory(entryPath);
        } catch {
          // Ignore folders Android cannot read and continue syncing the rest.
        }
        continue;
      }

      if (!/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(entry.name)) continue;
      try {
        const data = await Filesystem.readFile({ path: entryPath, directory: Directory.ExternalStorage });
        const binary = atob(typeof data.data === 'string' ? data.data : '');
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const mimeType = `audio/${entry.name.split('.').pop()?.toLowerCase() ?? 'mpeg'}`;
        imported.push(await saveMusicTrack(new File([bytes], entry.name, { type: mimeType }), entryPath));
      } catch {
        // Ignore files Android cannot read and continue syncing the rest.
      }
    }
  };

  await scanDirectory('Music');
  return imported;
}
