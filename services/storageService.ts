
const DB_NAME = 'GeoLinerQC_DB';
const STORE_NAME = 'projects';
const PROJECT_KEY = 'current_project';

// Open Database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Save Project Data (Async)
export const saveProjectData = async (data: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, PROJECT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Load Project Data
export const loadProjectData = async (): Promise<any | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(PROJECT_KEY);

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

// Get Storage Estimate (in MB)
export const getStorageUsageMB = async (): Promise<number> => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage) {
        return estimate.usage / 1024 / 1024;
      }
    } catch (e) {
      console.warn('Storage estimate failed', e);
    }
  }
  return 0;
};
