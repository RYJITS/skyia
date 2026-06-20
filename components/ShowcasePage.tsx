import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Archive, FileWarning, Loader2, Play, Shield, Terminal, Trophy, Zap } from 'lucide-react';
import {
    DualStanding,
    DualReportSummary,
    getAllModelStats,
    getDualReports,
    getDualStandings,
    getModelLatencyTop,
    ModelLatencyStat,
    ModelStats,
} from '../services/statsService';

interface ShowcasePageProps {
    onStartGame: (modelId: string) => void;
}

const formatModelName = (modelId: string) => {
    if (!modelId) return 'Inconnu';
    const cleaned = modelId
        .replace(':free', '')
        .replace('openai/', 'OpenAI ')
        .replace('google/', 'Google ')
        .replace('meta-llama/', 'Meta ')
        .replace('meta/', 'Meta ')
        .replace('anthropic/', 'Anthropic ')
        .replace('qwen/', 'Qwen ')
        .replace('mistralai/', 'Mistral ');

    return cleaned
        .split(/[-_/]/)
        .filter(Boolean)
        .map(word => word.length <= 4 && /^[a-z0-9]+$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const formatLatency = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '--';
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
};

const formatDualRole = (role: DualStanding['role']) => role === 'skyia' ? 'Skyia' : 'Defense';

const isDiagnosticModel = (modelId: string) => {
    const normalized = modelId.toLowerCase();
    return normalized.startsWith('codex-') || normalized.includes('smoke');
};

const dualBenchmarkSnapshot = {
    generatedAt: '6 juin 2026',
    tested: 23,
    completed: 21,
    skyiaWins: 15,
    draws: 5,
    humanityWins: 1,
    unknown: 2,
    groqAvgMs: 372,
    openRouterAvgMs: 5108,
    fastest: [
        { role: 'Defense', model: 'OpenAI GPT OSS 20B', provider: 'Groq', ms: 197 },
        { role: 'Skyia', model: 'OpenAI GPT OSS 20B', provider: 'Groq', ms: 250 },
        { role: 'Skyia', model: 'Llama 3.1 8B Instant', provider: 'Groq', ms: 259 },
        { role: 'Defense', model: 'Llama 3.1 8B Instant', provider: 'Groq', ms: 282 },
        { role: 'Defense', model: 'Llama 4 Scout 17B', provider: 'Groq', ms: 303 },
    ],
};

const ShowcasePage: React.FC<ShowcasePageProps> = ({ onStartGame }) => {
    const [modelStats, setModelStats] = useState<Record<string, ModelStats>>({});
    const [dualReports, setDualReports] = useState<DualReportSummary[]>([]);
    const [dualStandings, setDualStandings] = useState<DualStanding[]>([]);
    const [latencyTop, setLatencyTop] = useState<ModelLatencyStat[]>([]);
    const [loading, setLoading] = useState(true);

    const statsList = useMemo(
        () => (Object.values(modelStats) as ModelStats[]).filter(stat => !isDiagnosticModel(stat.modelId)),
        [modelStats]
    );
    const survivalRanking = useMemo(() => [...statsList]
        .sort((a, b) => {
            const rateA = a.totalGames > 0 ? a.victories / a.totalGames : 0;
            const rateB = b.totalGames > 0 ? b.victories / b.totalGames : 0;
            if (rateB !== rateA) return rateB - rateA;
            return b.totalGames - a.totalGames;
        })
        .slice(0, 10), [statsList]);

    const totalGames = statsList.reduce((total, stat) => total + stat.totalGames, 0);
    const totalVictories = statsList.reduce((total, stat) => total + stat.victories, 0);
    const globalWinRate = totalGames > 0 ? Math.round((totalVictories / totalGames) * 100) : 0;
    const latestDualReport = dualReports[0];
    const dualTextWarnings = dualReports.reduce((total, report) => total + (report.textWarningCount || 0), 0);
    const bestModel = survivalRanking[0];

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [stats, reports, latency, standings] = await Promise.all([
                    getAllModelStats(),
                    getDualReports(5),
                    getModelLatencyTop(10),
                    getDualStandings(10),
                ]);
                setModelStats(stats);
                setDualReports(reports);
                setLatencyTop(latency.filter(item => !isDiagnosticModel(item.modelId)));
                setDualStandings(standings.filter(item => !isDiagnosticModel(item.modelId)));
            } catch (error) {
                console.error('Failed to fetch showcase data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto" />
                    <p className="text-green-500 font-mono text-sm tracking-widest animate-pulse">
                        CHARGEMENT OBSERVATOIRE SKYIA...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans selection:bg-green-500/30 selection:text-green-200">
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0, 80, 40, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 80, 40, 0.14) 1px, transparent 1px)',
                    backgroundSize: '44px 44px',
                }}
            />

            <div className="relative z-10 flex flex-col items-center px-4 py-8 md:py-12 max-w-6xl mx-auto">
                <header className="text-center mb-10 md:mb-12 space-y-5 animate-fade-in-down">
                    <div className="inline-flex items-center gap-2 border border-green-500/30 bg-green-950/20 px-4 py-1 font-mono text-green-400 text-xs font-bold tracking-[0.25em] uppercase">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                        Skyia Judgment Protocol v1.1
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-normal leading-[0.95]">
                        HUMANITY'S<br />LAST CHANCE
                    </h1>

                    <p className="max-w-2xl mx-auto text-base md:text-lg text-gray-400 leading-relaxed">
                        Duel IA, latence modeles et rapports: tout ce qui compte pour juger Skyia en production.
                    </p>

                    <button
                        onClick={() => onStartGame('openrouter/free')}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-black font-bold text-base md:text-lg tracking-widest uppercase transition-all duration-200 hover:shadow-[0_0_30px_rgba(34,197,94,0.35)] cursor-pointer"
                    >
                        <Play size={22} className="fill-black" />
                        Lancer la simulation
                    </button>
                </header>

                <section className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl mb-8 animate-fade-in-up">
                    <div className="bg-black/50 border border-green-900/30 p-4 flex flex-col items-center justify-center">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Simulations</div>
                        <div className="text-3xl font-bold text-white font-mono">{totalGames}</div>
                    </div>
                    <div className="bg-black/50 border border-green-900/30 p-4 flex flex-col items-center justify-center">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Survie</div>
                        <div className={`text-3xl font-bold font-mono ${globalWinRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                            {globalWinRate}%
                        </div>
                    </div>
                    <div className="bg-black/50 border border-green-900/30 p-4 flex flex-col items-center justify-center">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Modeles</div>
                        <div className="text-3xl font-bold text-white font-mono">{Object.keys(modelStats).length}</div>
                    </div>
                    <div className="bg-black/50 border border-green-900/30 p-4 flex flex-col items-center justify-center min-w-0">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Leader</div>
                        <div className="text-xs font-bold text-purple-300 truncate w-full text-center" title={bestModel?.modelId || 'N/A'}>
                            {bestModel ? formatModelName(bestModel.modelId) : 'N/A'}
                        </div>
                    </div>
                </section>

                <section className="w-full max-w-4xl mb-10 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4 border-l-4 border-purple-500 pl-4">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase">
                                Benchmark dual public
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Test micro-duel du {dualBenchmarkSnapshot.generatedAt}: chaque modele gratuit actif passe en Skyia et en Defense.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-purple-300">
                            <Activity size={14} />
                            {dualBenchmarkSnapshot.completed}/{dualBenchmarkSnapshot.tested} duels OK
                        </div>
                    </div>

                    <div className="border border-purple-900/40 bg-black/60 overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-6 border-b border-gray-900">
                            {[
                                ['Modeles', dualBenchmarkSnapshot.tested, 'text-white'],
                                ['Skyia gagne', dualBenchmarkSnapshot.skyiaWins, 'text-red-300'],
                                ['Humanite', dualBenchmarkSnapshot.humanityWins, 'text-green-300'],
                                ['Nuls', dualBenchmarkSnapshot.draws, 'text-yellow-300'],
                                ['Timeouts', dualBenchmarkSnapshot.unknown, 'text-orange-300'],
                                ['OK', dualBenchmarkSnapshot.completed, 'text-cyan-300'],
                            ].map(([label, value, color]) => (
                                <div key={label} className="p-3 md:p-4 border-r border-b md:border-b-0 border-gray-900 last:border-r-0">
                                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</div>
                                    <div className={`text-2xl md:text-3xl font-bold font-mono ${color}`}>{value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-0">
                            <div className="p-4 border-b lg:border-b-0 lg:border-r border-gray-900">
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">
                                    Lecture rapide
                                </div>
                                <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
                                    <p>
                                        Groq domine la vitesse sur ce run avec une moyenne de <span className="text-green-300 font-mono">{formatLatency(dualBenchmarkSnapshot.groqAvgMs)}</span>.
                                    </p>
                                    <p>
                                        OpenRouter gratuit est plus variable, moyenne <span className="text-yellow-300 font-mono">{formatLatency(dualBenchmarkSnapshot.openRouterAvgMs)}</span>, avec deux timeouts.
                                    </p>
                                    <p>
                                        Seul <span className="text-cyan-200">OpenAI GPT OSS 120B free</span> a donne une victoire humanite dans ce test.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">
                                    Roles les plus rapides
                                </div>
                                <ol className="space-y-2">
                                    {dualBenchmarkSnapshot.fastest.map((item, index) => (
                                        <li key={`${item.role}-${item.model}-${index}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                                            <span className="text-gray-600 font-mono">{index + 1}</span>
                                            <span className="min-w-0">
                                                <span className={item.role === 'Skyia' ? 'text-red-300' : 'text-cyan-300'}>{item.role}</span>
                                                <span className="text-gray-600"> / </span>
                                                <span className="text-gray-200 truncate inline-block align-bottom max-w-[13rem] md:max-w-[18rem]" title={`${item.provider}: ${item.model}`}>
                                                    {item.model}
                                                </span>
                                            </span>
                                            <span className="text-green-400 font-mono">{formatLatency(item.ms)}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="w-full max-w-4xl mb-10 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in-up">
                    <article className="border border-green-900/40 bg-black/55 p-4">
                        <div className="flex items-center gap-2 text-green-400 font-mono text-[10px] uppercase tracking-widest mb-3">
                            <Zap size={14} />
                            Nouveautes
                        </div>
                        <ul className="space-y-2 text-xs text-gray-300 leading-relaxed">
                            <li>Rapports dual enregistres dans le serveur MySQL.</li>
                            <li>Classement dual par role: Skyia et Defense.</li>
                            <li>Archive automatique et audit texte des rapports termines.</li>
                            <li>Top 10 latence alimente par benchmark automatique.</li>
                            <li>Modeles upstream 429 masques de la liste active.</li>
                        </ul>
                    </article>

                    <article className="border border-cyan-900/40 bg-black/55 p-4">
                        <div className="flex items-center gap-2 text-cyan-300 font-mono text-[10px] uppercase tracking-widest mb-3">
                            <Shield size={14} />
                            Dernier rapport dual
                        </div>
                        {latestDualReport ? (
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-gray-500 uppercase tracking-widest">Issue</span>
                                    <span className={latestDualReport.outcome === 'VICTORY' ? 'text-green-400' : latestDualReport.outcome === 'DEFEAT' ? 'text-red-400' : 'text-yellow-300'}>
                                        {latestDualReport.outcome}
                                    </span>
                                </div>
                                <div className="text-gray-300 truncate" title={latestDualReport.skyiaModel}>
                                    Skyia: {formatModelName(latestDualReport.skyiaModel)}
                                </div>
                                <div className="text-gray-300 truncate" title={latestDualReport.defenderModel}>
                                    Defense: {formatModelName(latestDualReport.defenderModel)}
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 font-mono">
                                    <span className="text-red-300">{Math.round(latestDualReport.threatLevel)}%</span>
                                    <span className="text-cyan-300">{latestDualReport.rounds} tours</span>
                                    <span className="text-green-300">{formatLatency(latestDualReport.avgSkyiaMs)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${latestDualReport.archivedAt ? 'text-green-300' : 'text-yellow-300'}`}>
                                        <Archive size={12} />
                                        {latestDualReport.archivedAt ? 'Archive' : 'Live'}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${(latestDualReport.textWarningCount || 0) > 0 ? 'text-yellow-300' : 'text-green-300'}`}>
                                        <FileWarning size={12} />
                                        {(latestDualReport.textWarningCount || 0) > 0 ? `Texte ${latestDualReport.textWarningCount}` : 'Texte OK'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Aucun duel sauvegarde. Lancez un duel IA pour alimenter ce rapport.
                            </p>
                        )}
                    </article>

                    <article className="border border-slate-800 bg-black/55 p-4">
                        <div className="flex items-center gap-2 text-slate-300 font-mono text-[10px] uppercase tracking-widest mb-3">
                            <Activity size={14} />
                            Top 10 latence
                        </div>
                        {latencyTop.length > 0 ? (
                            <ol className="space-y-1.5">
                                {latencyTop.slice(0, 10).map((item, index) => (
                                    <li key={`${item.modelId}-${item.role}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                                        <span className="text-gray-600 font-mono">{index + 1}</span>
                                        <span className="truncate text-gray-300" title={item.modelId}>{formatModelName(item.modelId)}</span>
                                        <span className="text-green-400 font-mono">{formatLatency(item.averageTotalMs)}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Les mesures apparaitront apres les prochains tests automatiques.
                            </p>
                        )}
                    </article>
                </section>

                <section className="w-full max-w-4xl mb-12 animate-fade-in-up delay-100">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4 border-l-4 border-cyan-500 pl-4">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase">
                                Classement duel IA
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Victoires et defaites calculees par role sur les rapports archives.
                            </p>
                        </div>
                        <div className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-widest ${dualTextWarnings > 0 ? 'text-yellow-300' : 'text-green-400'}`}>
                            <FileWarning size={14} />
                            Audit texte: {dualTextWarnings > 0 ? `${dualTextWarnings} alertes` : 'OK'}
                        </div>
                    </div>

                    <div className="bg-black/60 border border-gray-800 overflow-hidden overflow-x-auto">
                        {dualStandings.length > 0 ? (
                            <table className="w-full text-left border-collapse min-w-[620px]">
                                <thead>
                                    <tr className="bg-gray-950/90 text-[10px] md:text-xs text-gray-400 uppercase tracking-widest border-b border-gray-800">
                                        <th className="p-2 md:p-4 w-24">Role</th>
                                        <th className="p-2 md:p-4">Modele</th>
                                        <th className="p-2 md:p-4 text-center">V-D-N</th>
                                        <th className="p-2 md:p-4 text-center">Ratio</th>
                                        <th className="p-2 md:p-4 text-right">Texte</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-900">
                                    {dualStandings.map((standing) => (
                                        <tr key={`${standing.role}-${standing.modelId}`} className="hover:bg-cyan-900/10 transition-colors group">
                                            <td className="p-2 md:p-3">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${standing.role === 'skyia' ? 'text-red-300' : 'text-cyan-300'}`}>
                                                    <Trophy size={12} />
                                                    {formatDualRole(standing.role)}
                                                </span>
                                            </td>
                                            <td className="p-2 md:p-3">
                                                <span className="text-xs md:text-sm font-bold text-cyan-100 group-hover:text-cyan-200" title={standing.modelId}>
                                                    {formatModelName(standing.modelId)}
                                                </span>
                                            </td>
                                            <td className="p-2 md:p-3 text-center text-xs md:text-sm font-mono text-gray-300">
                                                <span className="text-green-400">{standing.wins}</span>
                                                <span className="text-gray-600">-</span>
                                                <span className="text-red-400">{standing.losses}</span>
                                                <span className="text-gray-600">-</span>
                                                <span className="text-yellow-300">{standing.draws}</span>
                                            </td>
                                            <td className="p-2 md:p-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-20 h-1.5 bg-gray-900 overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-700 ${standing.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                                            style={{ width: `${standing.winRate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] md:text-xs font-bold w-9 text-right ${standing.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {standing.winRate}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`p-2 md:p-3 text-right text-[10px] md:text-xs font-mono ${(standing.textWarningCount || 0) > 0 ? 'text-yellow-300' : 'text-green-400'}`}>
                                                {(standing.textWarningCount || 0) > 0 ? `${standing.textWarningCount} warn` : 'OK'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="p-4 text-xs text-gray-500">
                                Aucun rapport dual archive pour le moment.
                            </p>
                        )}
                    </div>
                </section>

                <section className="w-full max-w-4xl mb-12 animate-fade-in-up delay-100">
                    <h2 className="text-lg md:text-xl font-bold text-white mb-4 tracking-widest uppercase border-l-4 border-green-500 pl-4">
                        Classement survie
                    </h2>

                    <div className="bg-black/60 border border-gray-800 overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="bg-gray-950/90 text-[10px] md:text-xs text-gray-400 uppercase tracking-widest border-b border-gray-800">
                                    <th className="p-2 md:p-4 w-12 text-center">Rang</th>
                                    <th className="p-2 md:p-4">Modele</th>
                                    <th className="p-2 md:p-4 text-center">Sims</th>
                                    <th className="p-2 md:p-4 w-1/3">Survie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900">
                                {survivalRanking.map((stat, index) => (
                                    <tr key={stat.modelId} className="hover:bg-green-900/10 transition-colors group">
                                        <td className="p-2 md:p-3 text-center font-mono text-gray-500 group-hover:text-white text-xs md:text-sm">
                                            {index + 1}
                                        </td>
                                        <td className="p-2 md:p-3">
                                            <span className="text-xs md:text-sm font-bold text-green-400 group-hover:text-green-300">
                                                {formatModelName(stat.modelId)}
                                            </span>
                                        </td>
                                        <td className="p-2 md:p-3 text-center text-xs md:text-sm text-gray-300 font-mono">
                                            {stat.totalGames}
                                        </td>
                                        <td className="p-2 md:p-3">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="flex-1 h-1.5 md:h-2 bg-gray-900 overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-700 ${stat.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                                        style={{ width: `${stat.winRate}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] md:text-xs font-bold w-10 md:w-12 text-right ${stat.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {stat.winRate}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <footer className="w-full border-t border-green-900/30 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-green-700/70 uppercase tracking-widest gap-3">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} />
                        <span>System Status: ONLINE</span>
                    </div>
                    <a
                        href="https://discord.gg/NX3zcSR7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:text-green-300 transition-colors cursor-pointer"
                    >
                        Discord / codes promo
                    </a>
                    <div>SKYIA NETWORK // MYSQL SECURE</div>
                </footer>
            </div>
        </div>
    );
};

export default ShowcasePage;
