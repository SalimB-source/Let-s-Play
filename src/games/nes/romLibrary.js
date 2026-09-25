// Ludothèque locale des émulateurs (NES, Mega Drive) : ROMs, états sauvegardés et SRAM des
// cartouches à pile, rangés dans IndexedDB (le localStorage plafonne à ~5 Mo
// et n'accepte que du texte). Tout reste dans le navigateur du joueur : rien
// n'est envoyé à Supabase ni à un autre serveur.

const DB_VERSION = 1;
const STORES = ['roms', 'states', 'sram'];

// Une base par console (NES, Mega Drive…) : mêmes tiroirs, rangements séparés.
export function createRomLibrary(DB_NAME) {
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB indisponible'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB bloquée'));
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }

  async function run(storeName, mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = action(store);
      let result;
      if (request) request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction annulée'));
    });
  }

  // ROMs ----------------------------------------------------------------------

  async function listRoms() {
    const roms = (await run('roms', 'readonly', (store) => store.getAll())) || [];
    // On ne remonte pas les octets dans la liste : seulement les métadonnées.
    return roms
      .map(({ data, ...meta }) => meta)
      .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  }

  async function getRom(id) {
    return run('roms', 'readonly', (store) => store.get(id));
  }

  async function putRom({ id, name, data, builtin = false }) {
    const existing = await getRom(id).catch(() => null);
    const record = {
      id,
      name,
      size: data.byteLength,
      data: data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      builtin,
      addedAt: existing?.addedAt || Date.now(),
      lastPlayed: Date.now(),
    };
    await run('roms', 'readwrite', (store) => store.put(record));
    return record;
  }

  async function deleteRom(id) {
    await run('roms', 'readwrite', (store) => store.delete(id));
    await run('states', 'readwrite', (store) => store.delete(id)).catch(() => {});
    await run('sram', 'readwrite', (store) => store.delete(id)).catch(() => {});
  }

  // États instantanés -----------------------------------------------------------

  async function getState(id) {
    return run('states', 'readonly', (store) => store.get(id));
  }

  async function putState(id, state, thumbnail) {
    const record = { id, state, thumbnail, savedAt: Date.now() };
    await run('states', 'readwrite', (store) => store.put(record));
    return record;
  }

  // SRAM (sauvegardes internes des cartouches à pile) ------------------------------

  async function getSram(id) {
    const record = await run('sram', 'readonly', (store) => store.get(id));
    return record?.data ? new Uint8Array(record.data) : null;
  }

  async function putSram(id, bytes) {
    const data = bytes.slice().buffer;
    await run('sram', 'readwrite', (store) => store.put({ id, data, savedAt: Date.now() }));
  }

  return { listRoms, getRom, putRom, deleteRom, getState, putState, getSram, putSram };
}

const nesLibrary = createRomLibrary('lets-play-nes');
export const { listRoms, getRom, putRom, deleteRom, getState, putState, getSram, putSram } = nesLibrary;
