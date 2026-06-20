import { UserApiKey } from '../types';
import { apiDelete, apiGet, apiPost } from './apiClient';

export const getUserApiKeys = async (): Promise<UserApiKey[]> => {
    const response = await apiGet<{ keys: UserApiKey[] }>('/user-keys');
    return response.keys || [];
};

export const saveUserApiKey = async (provider: 'openrouter' | 'groq', apiKey: string): Promise<void> => {
    await apiPost('/user-keys', { provider, apiKey });
};

export const deleteUserApiKey = async (provider: 'openrouter' | 'groq'): Promise<void> => {
    await apiDelete(`/user-keys/${provider}`);
};
