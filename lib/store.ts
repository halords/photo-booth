import type { StripRecord } from './types';

const CACHE = 'pocket-session-media-v1', PREFIX = '/__pocket_sessions/';
const key = (id: string, name: string) => new URL(PREFIX + encodeURIComponent(id) + '/' + encodeURIComponent(name), location.origin).href;
const openCache = () => {
  if (typeof caches === 'undefined') throw new Error('Browser cache is unavailable. Download this session to keep it.');
  return caches.open(CACHE);
};

/** Read existing galleries without creating a photo database. New sessions use Cache Storage. */
async function legacyDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return null;
  if (!(await indexedDB.databases()).some(db => db.name === 'booth')) return null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('booth');
    request.onupgradeneeded = () => { request.transaction?.abort(); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function legacyStrips(): Promise<StripRecord[]> {
  const db = await legacyDatabase(); if (!db) return [];
  try {
    return await new Promise<StripRecord[]>((resolve, reject) => {
      if (!db.objectStoreNames.contains('strips')) return resolve([]);
      const request = db.transaction('strips').objectStore('strips').getAll();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function putStrip(record: StripRecord, files?: File[]) {
  const cache = await openCache();
  try {
    if (files) for (const file of files) await cache.put(key(record.id, file.name), new Response(file, { headers: { 'Content-Type': file.type } }));
    await cache.put(key(record.id, 'manifest.json'), Response.json(record));
  } catch (error) {
    if (files) await Promise.all(files.map(file => cache.delete(key(record.id, file.name))));
    throw error;
  }
}
export async function sessionFiles(record: StripRecord): Promise<File[]> {
  const cache = await openCache(), files: File[] = [];
  for (const asset of record.assets || []) {
    const response = await cache.match(key(record.id, asset.name));
    if (!response) throw new Error('Part of this session has been cleared from the browser cache.');
    const blob = await response.blob();
    if (blob.size !== asset.size) throw new Error('This cached session is incomplete.');
    files.push(new File([blob], asset.name, { type: asset.type }));
  }
  return files;
}
export async function allStrips(): Promise<StripRecord[]> {
  const records = new Map((await legacyStrips().catch(() => [])).map(record => [record.id, record]));
  const cache = await openCache();
  for (const request of await cache.keys()) {
    if (!new URL(request.url).pathname.endsWith('/manifest.json')) continue;
    try {
      const response = await cache.match(request), record = await response?.json() as StripRecord;
      if (record?.id) records.set(record.id, record);
    } catch { /* One evicted entry must not hide the rest of the gallery. */ }
  }
  return Array.from(records.values()).sort((a, b) => b.ts - a.ts);
}
export async function deleteStrip(id: string) {
  const cache = await openCache(), prefix = key(id, '');
  await Promise.all((await cache.keys()).filter(request => request.url.startsWith(prefix)).map(request => cache.delete(request)));
  const db = await legacyDatabase();
  if (db) try {
    await new Promise<void>((resolve, reject) => {
      if (!db.objectStoreNames.contains('strips')) return resolve();
      const tx = db.transaction('strips', 'readwrite'); tx.objectStore('strips').delete(id);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
