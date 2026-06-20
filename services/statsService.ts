import { apiGet, apiPost } from './apiClient';
import type { StreamMetrics } from './aiService';
import { debugLog } from './debugLogger';

export interface ModelStats {
    modelId: string;
    victories: number;
    defeats: number;
    totalGames: number;
    winRate: number; // calculated field (0-100)
    // New fields for detailed analysis
    totalVictoryTurnCount?: number;
    totalDefeatTurnCount?: number;
    totalVictoryThreatLevel?: number; // Sum of final threat levels for victories only (usually < 100)
}

export interface DualReportSummary {
    id: string;
    date: string;
    skyiaModel: string;
    defenderModel: string;
    mode: string;
    outcome: 'VICTORY' | 'DEFEAT' | 'MAX_ROUNDS' | 'PAUSED' | 'UNKNOWN';
    threatLevel: number;
    rounds: number;
    messagesCount: number;
    avgSkyiaMs?: number | null;
    avgDefenderMs?: number | null;
    skyiaErrors: number;
    defenderErrors: number;
    archivedAt?: string | null;
    textStatus?: 'OK' | 'WARN';
    textWarningCount?: number;
}

export interface DualReportPayload {
    id?: string;
    skyiaModel: string;
    defenderModel: string;
    mode: 'v1.0' | 'v1.1';
    outcome: DualReportSummary['outcome'];
    threatLevel: number;
    rounds: number;
    messagesCount: number;
    avgSkyiaMs?: number | null;
    avgDefenderMs?: number | null;
    skyiaErrors?: number;
    defenderErrors?: number;
    payload?: Record<string, unknown>;
}

export interface ModelLatencyStat {
    modelId: string;
    provider: string;
    role: 'skyia' | 'defender';
    sampleCount: number;
    successCount: number;
    errorCount: number;
    averageTotalMs: number;
    averageFirstTokenMs?: number | null;
    lastChecked: string;
}

export interface DualStanding {
    modelId: string;
    role: 'skyia' | 'defender';
    wins: number;
    losses: number;
    draws: number;
    totalReports: number;
    winRate: number;
    errorCount: number;
    averageMs?: number | null;
    textWarningCount: number;
    lastReportAt: string;
}

/**
 * Records a game result for a specific model via the Skyia API.
 */
export const recordGameResult = async (
    modelId: string,
    result: 'VICTORY' | 'DEFEAT',
    turnCount: number,
    finalThreatLevel: number
) => {
    debugLog(`[STATS] Submitting securely: ${result} for ${modelId}`);

    try {
        await apiPost('/stats/result', {
            modelId,
            result,
            turnCount,
            finalThreatLevel
        });
        debugLog('[STATS] Submission successful');
    } catch (error) {
        console.error('[STATS] CRITICAL SUBMISSION ERROR:', error);
    }
};

/**
 * Fetches stats for all models.
 * Returns an object mapping modelId to ModelStats.
 */
export const getAllModelStats = async (): Promise<Record<string, ModelStats>> => {
    try {
        const response = await apiGet<{ stats: Record<string, ModelStats> }>('/stats/models');
        return response.stats || {};
    } catch (error) {
        console.error("Error fetching model stats:", error);
        return {};
    }
};

export const recordDualReport = async (report: DualReportPayload): Promise<void> => {
    try {
        await apiPost('/stats/dual-report', report);
    } catch (error) {
        console.error('[STATS] Dual report submission failed:', error);
    }
};

export const getDualReports = async (limit = 5): Promise<DualReportSummary[]> => {
    try {
        const response = await apiGet<{ reports: DualReportSummary[] }>(`/stats/dual-reports?limit=${encodeURIComponent(String(limit))}&archived=1`);
        return response.reports || [];
    } catch (error) {
        console.error('Error fetching dual reports:', error);
        return [];
    }
};

export const getDualStandings = async (limit = 10): Promise<DualStanding[]> => {
    try {
        const response = await apiGet<{ standings: DualStanding[] }>(`/stats/dual-standings?limit=${encodeURIComponent(String(limit))}`);
        return response.standings || [];
    } catch (error) {
        console.error('Error fetching dual standings:', error);
        return [];
    }
};

export const recordModelLatency = async (metrics: StreamMetrics): Promise<void> => {
    if (!metrics.requestedModel) return;
    try {
        await apiPost('/stats/latency', {
            modelId: metrics.providerModel || metrics.requestedModel,
            provider: metrics.provider || 'unknown',
            role: metrics.role,
            status: metrics.status === 'error' ? 'error' : 'ok',
            totalMs: metrics.totalMs ?? metrics.backendTotalMs ?? null,
            firstTokenMs: metrics.firstTokenMs ?? metrics.backendFirstByteMs ?? null,
            promptChars: metrics.promptChars,
            messageCount: metrics.messageCount,
            error: metrics.error,
        });
    } catch (error) {
        console.error('[STATS] Latency submission failed:', error);
    }
};

export const getModelLatencyTop = async (limit = 10): Promise<ModelLatencyStat[]> => {
    try {
        const response = await apiGet<{ latency: ModelLatencyStat[] }>(`/stats/latency?limit=${encodeURIComponent(String(limit))}`);
        return response.latency || [];
    } catch (error) {
        console.error('Error fetching model latency stats:', error);
        return [];
    }
};

