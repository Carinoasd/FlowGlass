// 流璃 FlowGlass — IndexedDB 桌布儲存
const DB_NAME = 'flowglass';
const DB_VER = 1;
const STORE = 'wallpapers';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode) {
  return openDB().then(db => db.transaction(STORE, mode).objectStore(STORE));
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// record: { id, name, type(mime), blob, thumb(dataURL), added }
export async function putWallpaper(rec) {
  const store = await tx('readwrite');
  return wrap(store.put(rec));
}

export async function getWallpaper(id) {
  const store = await tx('readonly');
  return wrap(store.get(id));
}

export async function getAllWallpapers() {
  const store = await tx('readonly');
  const all = await wrap(store.getAll());
  return all.sort((a, b) => a.added - b.added);
}

export async function deleteWallpaper(id) {
  const store = await tx('readwrite');
  return wrap(store.delete(id));
}
