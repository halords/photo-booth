/* Tiny IndexedDB wrapper for the session gallery. Strips never leave the device. */
const Store = (() => {
  'use strict';
  const DB = 'booth', TABLE = 'strips';
  let dbp = null;

  function open() {
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

  function tx(mode) {
    return open().then((db) => db.transaction(TABLE, mode).objectStore(TABLE));
  }

  async function put(item) {
    const s = await tx('readwrite');
    return new Promise((res, rej) => {
      const r = s.put(item);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  async function all() {
    const s = await tx('readonly');
    return new Promise((res, rej) => {
      const r = s.getAll();
      r.onsuccess = () => res((r.result || []).sort((a, b) => b.ts - a.ts));
      r.onerror = () => rej(r.error);
    });
  }

  async function del(id) {
    const s = await tx('readwrite');
    return new Promise((res, rej) => {
      const r = s.delete(id);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  }

  return { put, all, del };
})();
