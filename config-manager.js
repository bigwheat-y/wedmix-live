/**
 * WedMix Live Persistent Cache & Profile Manager
 * Utilizes IndexedDB to cache raw audio files persistently in the browser.
 * Packs and unpacks wedding itineraries, soundboard mappings, and settings in JSON.
 */

const DB_NAME = 'WedMixLiveDB';
const DB_VERSION = 1;
let dbInstance = null;

/**
 * Initializes the IndexedDB database instance.
 */
export function initDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Store raw audio files persistently (keyed by trackId)
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks');
      }
      
      // Store wedding configuration profiles
      if (!db.objectStoreNames.contains('configs')) {
        db.createObjectStore('configs', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error('IndexedDB 数据库初始化失败:', e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Persists an audio File or Blob in IndexedDB.
 * @param {string} trackId Unique identifier for the track
 * @param {Blob|File} blob Binary audio file
 */
export async function cacheAudioFile(trackId, blob) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['tracks'], 'readwrite');
    const store = transaction.objectStore('tracks');
    const request = store.put(blob, trackId);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves a cached audio File/Blob from IndexedDB.
 * @param {string} trackId Unique identifier for the track
 * @returns {Promise<Blob|null>}
 */
export async function getCachedAudioFile(trackId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['tracks'], 'readonly');
    const store = transaction.objectStore('tracks');
    const request = store.get(trackId);

    request.onsuccess = (e) => resolve(e.target.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Deletes a cached track from IndexedDB.
 * @param {string} trackId Unique identifier for the track
 */
export async function deleteCachedAudioFile(trackId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['tracks'], 'readwrite');
    const store = transaction.objectStore('tracks');
    const request = store.delete(trackId);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Generates a config JSON object (does NOT trigger download).
 * Used by ZIP export to embed config.json inside the archive.
 */
export function generateConfigObject(schemeName, scenes, soundboard, crossfade) {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    schemeName: schemeName || '未知新郎 & 新娘婚礼配乐方案',
    crossfade: crossfade || 2.0,
    scenes: scenes.map(s => ({
      id: s.id,
      name: s.name,
      assignedTrackId: s.assignedTrackId || null,
      assignedTrackName: s.assignedTrackName || null,
      audioZipPath: s.assignedTrackName ? `audio/scene_${s.id}_${s.assignedTrackName}` : null,
      fadeIn: s.fadeIn || 0,
      fadeOut: s.fadeOut || 0,
      startTime: s.startTime || 0,
      endTime: s.endTime || null,
      loop: s.loop || false
    })),
    soundboard: soundboard.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type || 'synth',
      synthEffectId: p.synthEffectId || null,
      assignedTrackId: p.assignedTrackId || null,
      assignedTrackName: p.assignedTrackName || null,
      audioZipPath: (p.type === 'custom' && p.assignedTrackName) ? `audio/pad_${p.id}_${p.assignedTrackName}` : null
    }))
  };
}

/**
 * Export the current wedding configuration scheme to a standalone JSON file download.
 * (Legacy fallback — ZIP export is the primary method now.)
 */
export function exportWeddingConfigJSON(schemeName, scenes, soundboard, crossfade) {
  const configProfile = generateConfigObject(schemeName, scenes, soundboard, crossfade);

  const jsonString = JSON.stringify(configProfile, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // Trigger file download
  const cleanSchemeName = schemeName.replace(/[^\w\u4e00-\u9fa5]/gi, '_');
  const filename = `WedMix_${cleanSchemeName}_${new Date().toISOString().slice(0, 10)}.json`;
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Clears all cached audio tracks in the 'tracks' object store.
 * @returns {Promise<void>}
 */
export async function clearAllCaches() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['tracks'], 'readwrite');
    const store = transaction.objectStore('tracks');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}
