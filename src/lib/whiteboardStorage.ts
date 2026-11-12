import { WhiteboardProject } from '../types/whiteboard';

const DB_NAME = 'SmartWhiteboardDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_META = 'meta';

const LEGACY_STORAGE_PREFIX = 'smart_whiteboard_proj_';
const LEGACY_LAST_PROJECT_KEY = 'smart_whiteboard_last_id';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to open IndexedDB for SmartWhiteboard:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Migrate any existing projects from localStorage to IndexedDB, then remove them from localStorage
 * to free up valuable localStorage quota.
 */
export async function migrateLegacyProjects(): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const legacyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_STORAGE_PREFIX)) {
        legacyKeys.push(key);
      }
    }

    if (legacyKeys.length === 0) return;

    const db = await getDB();
    const tx = db.transaction([STORE_PROJECTS, STORE_META], 'readwrite');
    const projectStore = tx.objectStore(STORE_PROJECTS);
    const metaStore = tx.objectStore(STORE_META);

    for (const key of legacyKeys) {
      try {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const parsed = JSON.parse(itemStr);
          if (parsed && parsed.id) {
            projectStore.put(parsed);
          }
        }
        // Remove from localStorage to reclaim quota
        localStorage.removeItem(key);
      } catch (err) {
        console.warn('Error migrating legacy whiteboard item:', key, err);
      }
    }

    const lastId = localStorage.getItem(LEGACY_LAST_PROJECT_KEY);
    if (lastId) {
      metaStore.put({ key: 'lastProjectId', value: lastId });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Legacy migration notice:', e);
  }
}

/**
 * Save a whiteboard project to IndexedDB.
 */
export async function saveWhiteboardProjectToStorage(project: WhiteboardProject, setAsLastProject = true): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction([STORE_PROJECTS, STORE_META], 'readwrite');
    const projectStore = tx.objectStore(STORE_PROJECTS);
    const metaStore = tx.objectStore(STORE_META);

    projectStore.put(project);
    if (setAsLastProject) {
      metaStore.put({ key: 'lastProjectId', value: project.id });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (setAsLastProject) {
      // Also store last id in localStorage as light fallback (tiny string, never exceeds quota)
      try {
        localStorage.setItem(LEGACY_LAST_PROJECT_KEY, project.id);
      } catch {
        // Ignore if localStorage quota is tight
      }
    }
  } catch (err) {
    console.error('Error saving whiteboard project to IndexedDB:', err);
    // Fallback: try saving safely without crashing
    throw err;
  }
}

/**
 * Load a single project by ID from IndexedDB or legacy localStorage.
 */
export async function loadWhiteboardProjectFromStorage(id: string): Promise<WhiteboardProject | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);

    const project = await new Promise<WhiteboardProject | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (project) return project;
  } catch (e) {
    console.warn('IndexedDB load error, checking legacy fallback:', e);
  }

  // Fallback to legacy localStorage
  try {
    const saved = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${id}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Fallback localStorage load error:', e);
  }

  return null;
}

/**
 * Get the last active project ID.
 */
export async function getLastProjectId(): Promise<string | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);

    const result = await new Promise<{ key: string; value: string } | null>((resolve, reject) => {
      const request = store.get('lastProjectId');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (result && result.value) return result.value;
  } catch (e) {
    // Fallback
  }

  try {
    return localStorage.getItem(LEGACY_LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

/**
 * Load all saved whiteboard projects from IndexedDB and merge legacy projects.
 */
export async function loadAllWhiteboardProjectsFromStorage(): Promise<WhiteboardProject[]> {
  // First migrate any legacy entries
  await migrateLegacyProjects();

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);

    const projects = await new Promise<WhiteboardProject[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Sort by updatedAt descending
    return projects.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Error loading all projects from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a project from storage.
 */
export async function deleteWhiteboardProjectFromStorage(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);

    store.delete(id);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error deleting project from IndexedDB:', err);
  }

  try {
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${id}`);
  } catch {
    // ignore
  }
}

export const AUTOSAVE_STORAGE_KEY = 'wb_autosave_latest_project';
export const AUTOSAVE_META_KEY = 'wb_autosave_timestamp';

/**
 * Synchronously auto-save project content to localStorage.
 * Runs debounced and immediately on beforeunload/pagehide to prevent any data loss.
 */
export function saveWhiteboardAutosaveToLocalStorage(project: WhiteboardProject): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      ...project,
      updatedAt: new Date(timestamp).toISOString(),
      _autosaveTimestamp: timestamp
    });
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, payload);
    localStorage.setItem(`wb_autosave_${project.id}`, payload);
    localStorage.setItem(AUTOSAVE_META_KEY, String(timestamp));
    return true;
  } catch (err: any) {
    // Handle QuotaExceededError by omitting heavy base64 strings while keeping 100% of strokes and annotations
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      try {
        const lightweightPages = project.pages.map(p => ({
          ...p,
          backgroundImage: p.backgroundImage && p.backgroundImage.length > 50000 
            ? undefined 
            : p.backgroundImage
        }));
        const compactPayload = JSON.stringify({
          ...project,
          pages: lightweightPages,
          updatedAt: new Date().toISOString(),
          _autosaveTimestamp: Date.now(),
          _isCompactAutosave: true
        });
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, compactPayload);
        localStorage.setItem(AUTOSAVE_META_KEY, String(Date.now()));
        return true;
      } catch (innerErr) {
        console.warn('Unable to write compact autosave to localStorage:', innerErr);
        return false;
      }
    }
    console.warn('Error saving whiteboard autosave to localStorage:', err);
    return false;
  }
}

/**
 * Load the latest auto-saved whiteboard session from localStorage.
 */
export function loadWhiteboardAutosaveFromLocalStorage(): (WhiteboardProject & { _autosaveTimestamp?: number }) | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && parsed.id && Array.isArray(parsed.pages)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse autosaved whiteboard project from localStorage:', err);
  }
  return null;
}

/**
 * Clear the autosaved whiteboard draft from localStorage.
 */
export function clearWhiteboardAutosaveFromLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    localStorage.removeItem(AUTOSAVE_META_KEY);
  } catch {
    // ignore
  }
}
