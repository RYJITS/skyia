import { apiGet } from './apiClient';
import { debugLog } from './debugLogger';
import { readStoredArray } from './localStorageJson';

export interface AIModel {
    id: string;
    name: string;
    cost: number; // 0, 1, 2
    category: 'standard' | 'premium';
    provider: 'openrouter' | 'groq';
    sourceProvider?: string;
    isFree?: boolean;
    hidden?: boolean;
    requiresUserKey?: boolean;
    contextLength?: number;
}

declare global {
    interface Window {
        resetModels?: () => Promise<void>;
    }
}

const FALLBACK_FREE_MODELS: AIModel[] = [
    { id: 'openrouter/free', name: 'OpenRouter Free Router', cost: 0, category: 'standard', provider: 'openrouter', isFree: true },
    { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 Free', cost: 0, category: 'standard', provider: 'openrouter', isFree: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Free', cost: 0, category: 'standard', provider: 'openrouter', isFree: true },
    { id: 'llama-3.1-8b-instant', name: 'Groq Llama 3.1 8B Instant', cost: 0, category: 'standard', provider: 'groq', isFree: true },
];



let cachedModels: AIModel[] = [];

export const __resetModelCacheForTests = () => {
    cachedModels = [];
};

if (typeof window !== 'undefined') {
    window.resetModels = async () => {
        cachedModels = [];
        alert("Model cache reset locally.");
    };
}

export const fetchModels = async (): Promise<AIModel[]> => {
    let models: AIModel[] = [...cachedModels];

    if (models.length === 0) {
        try {
            const response = await apiGet<{ models: AIModel[] }>('/models');
            models = Array.isArray(response.models) && response.models.length > 0 ? response.models : [...FALLBACK_FREE_MODELS];
        } catch (error) {
            console.warn("[MODEL_SYNC] Falling back to local model list", error);
            models = [...FALLBACK_FREE_MODELS];
        }
    }

    try {
        const customModels = readStoredArray<AIModel>('skyia_custom_models');
        if (Array.isArray(customModels)) {
            const existingIds = new Set(models.map(m => m.id));
            const newModels = customModels.filter((m: AIModel) => !existingIds.has(m.id));
            if (newModels.length > 0) {
                debugLog("[MODEL_SYNC] Adding custom models:", newModels.map(m => m.id));
                models = [...models, ...newModels];
            }
        }
    } catch (e) {
        console.error("Failed to load custom models", e);
    }

    // 2. Sort
    models.sort((a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        return a.name.localeCompare(b.name);
    });

    // 3. Filter Banned
    const banned = readStoredArray<string>('skyia_banned_models');
    if (banned.length > 0) {
        models = models.filter(m => !banned.includes(m.id));
    }

    // Update Cache
    cachedModels = models;
    return models;
};

// Export helper to add custom model
export const addCustomModel = (model: AIModel) => {
    let custom = readStoredArray<AIModel>('skyia_custom_models');
    // Avoid dupes locally too
    if (!custom.find((m: AIModel) => m.id === model.id)) {
        custom.push(model);
        localStorage.setItem('skyia_custom_models', JSON.stringify(custom));
    }

    // TRACK HISTORY (For Cloud Icon logic)
    let history = readStoredArray<string>('skyia_model_history');
    if (!history.includes(model.id)) {
        history.push(model.id);
        localStorage.setItem('skyia_model_history', JSON.stringify(history));
    }

    // REMOVE TOMBSTONE (Resurrection)
    let deleted = readStoredArray<string>('skyia_deleted_models');
    // Filter out both explicit deletes AND bans to ensure clean install
    const newDeleted = deleted.filter((id: string) => id !== model.id);
    if (newDeleted.length !== deleted.length) {
        localStorage.setItem('skyia_deleted_models', JSON.stringify(newDeleted));
    }

    // UNBAN (If previously banned)
    let banned = readStoredArray<string>('skyia_banned_models');
    if (banned.includes(model.id)) {
        const newBanned = banned.filter((id: string) => id !== model.id);
        localStorage.setItem('skyia_banned_models', JSON.stringify(newBanned));
        debugLog(`[MODEL] Unbanned manual install: ${model.id}`);
    }

    cachedModels = [];
};

export const getModelHistory = (): string[] => {
    return readStoredArray<string>('skyia_model_history');
};

export const removeCustomModel = (modelId: string) => {
    let custom = readStoredArray<AIModel>('skyia_custom_models');
    custom = custom.filter((m: AIModel) => m.id !== modelId);
    localStorage.setItem('skyia_custom_models', JSON.stringify(custom));

    // TOMBSTONE (Prevent Cloud Sync Resurrection)
    let deleted = readStoredArray<string>('skyia_deleted_models');
    if (!deleted.includes(modelId)) {
        deleted.push(modelId);
        localStorage.setItem('skyia_deleted_models', JSON.stringify(deleted));
    }

    cachedModels = [];
};

export const getModelCostFromList = (modelId: string, modelList: AIModel[]): number => {
    const model = modelList.find(m => m.id === modelId);
    if (model) return model.cost;
    if (modelId.includes(':free') || modelId.endsWith('-free') || modelId === 'openrouter/free') return 0;
    return 1;
};

export const banModel = (modelId: string) => {
    try {
        debugLog(`[MODEL] Banning model ${modelId} due to errors/quota.`);
        const banned = readStoredArray<string>('skyia_banned_models');
        if (!banned.includes(modelId)) {
            banned.push(modelId);
            localStorage.setItem('skyia_banned_models', JSON.stringify(banned));
        }
        cachedModels = [];
    } catch (e) {
        console.error("Failed to ban model", e);
    }
};
