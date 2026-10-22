import type { StripRecord } from './types';
const DB = 'booth', TABLE = 'strips';
let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(TABLE)) req.result.createObjectStore(TABLE, { keyPath: 'id' }); };
    req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); dbp = null; }; resolve(req.result); };
    req.onerror = () => reject(req.error);
  }).catch(error => { dbp = null; throw error; });
  return dbp;
}
async function mutate(operation: (s: IDBObjectStore) => void) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TABLE, 'readwrite');
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Gallery save interrupted.'));
    operation(tx.objectStore(TABLE));
  });
}
export const putStrip = (record: StripRecord) => mutate(s => { s.put(record); });
export const deleteStrip = (id: string) => mutate(s => { s.delete(id); });
export async function allStrips(): Promise<StripRecord[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction(TABLE, 'readonly').objectStore(TABLE).getAll();
    request.onsuccess = () => resolve((request.result as StripRecord[]).sort((a, b) => b.ts - a.ts)); request.onerror = () => reject(request.error);
  });
}
