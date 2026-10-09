import type { StripRecord } from './types';

const DB = 'booth';
const TABLE = 'strips';

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TABLE)) {
        db.createObjectStore(TABLE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await open();
  return db.transaction(TABLE, mode).objectStore(TABLE);
}

export async function putStrip(item: StripRecord): Promise<void> {
  const s = await store('readwrite');
  await new Promise<void>((res, rej) => {
    const r = s.put(item);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

export async function allStrips(): Promise<StripRecord[]> {
  const s = await store('readonly');
  return new Promise((res, rej) => {
    const r = s.getAll();
    r.onsuccess = () =>
      res(((r.result as StripRecord[]) || []).sort((a, b) => b.ts - a.ts));
    r.onerror = () => rej(r.error);
  });
}

export async function deleteStrip(id: string): Promise<void> {
  const s = await store('readwrite');
  return new Promise((res, rej) => {
    const r = s.delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}
