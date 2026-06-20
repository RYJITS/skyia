export const readStoredArray = <T>(key: string): T[] => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn(`[storage] Invalid JSON for ${key}, resetting to empty array.`, error);
        try {
            localStorage.removeItem(key);
        } catch {
            // Ignore cleanup failures and still fall back safely.
        }
        return [];
    }
};
