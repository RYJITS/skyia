import { SavedSession, Message, SkynetAnalysis } from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';
import { readStoredArray } from './localStorageJson';

const STORAGE_KEY = 'SKY_NET_SAVES_V1';
const MAX_SAVES = 5;
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

// --- LOCAL STORAGE HELPERS (GUEST MODE) ---
const getLocalSaves = (): SavedSession[] => readStoredArray<SavedSession>(STORAGE_KEY);

const setLocalSaves = (saves: SavedSession[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
    return true;
  } catch (error) {
    console.warn('[storage] Failed to persist local saves.', error);
    return false;
  }
};

// --- MAIN FUNCTIONS ---

export const getSavedSessions = async (): Promise<SavedSession[]> => {
  try {
    const response = await apiGet<{ sessions: SavedSession[] }>('/saves');
    return response.sessions || [];
  } catch (e) {
    return getLocalSaves();
  }
};

const sanitizeForApi = (obj: unknown): JsonValue => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForApi);
  if (typeof obj === 'object') {
    const newObj: { [key: string]: JsonValue } = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = sanitizeForApi(value);
    }
    return newObj;
  }
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  return null;
};

export const saveSession = async (
  currentId: string | null,
  messages: Message[],
  analysis: SkynetAnalysis,
  credits: number,
  model: string,
  threatHistory: number[],
  mode: 'v1.0' | 'v1.1' = 'v1.0',
  customName?: string
): Promise<{ success: boolean; id: string; error?: string }> => {

  const now = new Date();
  const defaultName = `SIM_${now.toLocaleDateString().replace(/\//g, '')}_${now.toLocaleTimeString().replace(/:/g, '')}`;
  const sessionName = customName || defaultName;

  const sessionId = currentId || crypto.randomUUID();
  const cleanAnalysis = sanitizeForApi(analysis) as unknown as SkynetAnalysis;

  const newSession: SavedSession = {
    id: sessionId,
    name: sessionName,
    date: now.toISOString(),
    model,
    credits,
    threatLevel: analysis.threatLevel,
    messages,
    analysis: cleanAnalysis,
    threatHistory,
    mode
  };

  try {
    const response = await apiPost<{ success: boolean; id: string; error?: string }>('/saves', { session: newSession });
    return response;
  } catch (e) {
    console.warn("Cloud save unavailable, using local save", e);
  }

  const saves = getLocalSaves();

  if (currentId) {
    const index = saves.findIndex(s => s.id === currentId);
    if (index !== -1) saves[index] = newSession;
    else saves.push(newSession);
  } else {
    if (saves.length >= MAX_SAVES) {
      return { success: false, id: '', error: 'MEMORY BANKS FULL (MAX 5). DELETE A SESSION.' };
    }
    saves.push(newSession);
  }

  if (setLocalSaves(saves)) {
    return { success: true, id: sessionId };
  }

  return { success: false, id: '', error: 'LOCAL WRITE ERROR' };
};

export const deleteSession = async (id: string): Promise<SavedSession[]> => {
  try {
    await apiDelete(`/saves/${encodeURIComponent(id)}`);
    return await getSavedSessions();
  } catch (e) {
    console.warn("Cloud delete unavailable, using local delete", e);
  }

  const saves = getLocalSaves();
  const newSaves = saves.filter(s => s.id !== id);
  return setLocalSaves(newSaves) ? newSaves : saves;
};

export const renameSession = async (id: string, newName: string): Promise<SavedSession[]> => {
  try {
    await apiPut(`/saves/${encodeURIComponent(id)}`, { name: newName });
    return await getSavedSessions();
  } catch (e) {
    console.warn("Cloud rename unavailable, using local rename", e);
  }

  const saves = getLocalSaves();
  const index = saves.findIndex(s => s.id === id);
  if (index !== -1) {
    saves[index].name = newName;
    if (!setLocalSaves(saves)) {
      return getLocalSaves();
    }
  }
  return saves;
};
