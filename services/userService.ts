import { apiDelete, apiPost, apiPut } from './apiClient';
import { AIModel } from './modelService';
import { readStoredArray } from './localStorageJson';

export const updateUserStats = async (_uid: string, result: 'VICTORY' | 'DEFEAT', creditsUsed: number): Promise<void> => {
    await apiPut('/auth/profile', { statsResult: result, creditsUsed });
};

export const updateUserProfile = async (_uid: string, data: { displayName?: string }): Promise<void> => {
    await apiPut('/auth/profile', data);
};

export const saveCustomModelToProfile = async (_uid: string, model: AIModel) => {
    await apiPost('/custom-models', { model });
};

export const syncCloudModelsToLocal = (cloudModels: AIModel[]) => {
    if (!cloudModels || cloudModels.length === 0) return;
    try {
        let local = readStoredArray<AIModel>('skyia_custom_models');
        const deletedIds = new Set(readStoredArray<string>('skyia_deleted_models'));
        const localIds = new Set(local.map((model) => model.id));
        let addedCount = 0;

        cloudModels.forEach(model => {
            if (!localIds.has(model.id) && !deletedIds.has(model.id)) {
                local.push(model);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            localStorage.setItem('skyia_custom_models', JSON.stringify(local));
        }
    } catch (e) {
        console.error("Error syncing cloud models to local:", e);
    }
};

export const removeCustomModelFromProfile = async (_uid: string, model: AIModel) => {
    await apiDelete(`/custom-models/${encodeURIComponent(model.id)}`);
};
