import { AIModel } from './modelService';
import { apiGet } from './apiClient';

interface OpenRouterModel {
    id: string;
    name: string;
    pricing: {
        prompt: string;
        completion: string;
    };
    context_length: number;
}

// NEW: Discover ALL models (Free + Paid)
export const discoverAllModels = async (): Promise<AIModel[]> => {
    try {
        const data = await apiGet<{ models: AIModel[] }>('/models');
        return data.models.sort((a, b) => {
            if (a.cost !== b.cost) return a.cost - b.cost;
            return a.name.localeCompare(b.name);
        });
    } catch (e) {
        console.error("Discovery Failed", e);
        return [];
    }
};

// Keep alias for backward compatibility until refactor is complete
export const discoverFreeModels = discoverAllModels;
