const DATABASE_NAME = 'viento-sur-fm';
const STORE_NAME = 'pad-audio';
const PANEL_COUNT = 2;
const PAD_COUNT = 15;
const LOCAL_STORAGE_KEY = 'viento-sur-fm-pads';

interface StoredPad {
  id: string;
  name: string;
  type: string;
  blob: Blob;
}

interface LocalStoredPad {
  name: string;
  type: string;
  dataUrl: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(record: LocalStoredPad): Promise<File> {
  const response = await fetch(record.dataUrl);
  const blob = await response.blob();
  return new File([blob], record.name, { type: record.type || blob.type || 'audio/mpeg' });
}

function emptyPads(): Array<Array<File | null>> {
  return Array.from({ length: PANEL_COUNT }, () => Array<File | null>(PAD_COUNT).fill(null));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadStoredPads(): Promise<Array<Array<File | null>>> {
  const pads = emptyPads();
  try {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
      const records = JSON.parse(localData) as Record<string, LocalStoredPad>;
      await Promise.all(Object.entries(records).map(async ([id, record]) => {
        const [panel, pad] = id.split('-').map(Number);
        if (panel >= 0 && panel < PANEL_COUNT && pad >= 0 && pad < PAD_COUNT) pads[panel][pad] = await dataUrlToFile(record);
      }));
      return pads;
    }

    const database = await openDatabase();
    const records = await new Promise<StoredPad[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as StoredPad[]);
      request.onerror = () => reject(request.error);
    });
    database.close();
    records.forEach((record) => {
      const [panel, pad] = record.id.split('-').map(Number);
      if (panel >= 0 && panel < PANEL_COUNT && pad >= 0 && pad < PAD_COUNT) {
        pads[panel][pad] = new File([record.blob], record.name, { type: record.type || record.blob.type || 'audio/mpeg' });
      }
    });
    await Promise.all(pads.flatMap((panel, panelIndex) => panel.map(async (file, padIndex) => {
      if (file) await savePad(panelIndex, padIndex, file);
    })));
  } catch {
    // Audio pads remain empty when persistent storage is unavailable.
  }
  return pads;
}

export async function savePad(panelIndex: number, padIndex: number, file: File): Promise<void> {
  try {
    const records = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}') as Record<string, LocalStoredPad>;
    records[`${panelIndex}-${padIndex}`] = { name: file.name, type: file.type, dataUrl: await fileToDataUrl(file) };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // The pad still works for the current session if local storage is unavailable.
  }
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({
        id: `${panelIndex}-${padIndex}`,
        name: file.name,
        type: file.type,
        blob: file,
      } satisfies StoredPad);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    // The pad still works for the current session if storage is unavailable.
  }
}

export async function deletePad(panelIndex: number, padIndex: number): Promise<void> {
  try {
    const records = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}') as Record<string, LocalStoredPad>;
    delete records[`${panelIndex}-${padIndex}`];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore local storage errors; the UI state is still updated.
  }
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(`${panelIndex}-${padIndex}`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    // Ignore storage errors; the UI state is still updated.
  }
}
