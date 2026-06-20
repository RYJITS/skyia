import React, { useId, useState } from 'react';
import { RefreshCw, Download, Check, X, ShieldAlert, CloudDownload } from 'lucide-react';
import { AIModel, addCustomModel, removeCustomModel, getModelHistory } from '../services/modelService';
import { discoverFreeModels } from '../services/discoveryService';
import { useAuth } from '../services/AuthContext';
import { saveCustomModelToProfile, removeCustomModelFromProfile } from '../services/userService';
import { debugLog } from '../services/debugLogger';
import { readStoredArray } from '../services/localStorageJson';

interface DiscoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentModelId: string;
}

const DiscoveryModal: React.FC<DiscoveryModalProps> = ({ isOpen, onClose, currentModelId }) => {
    const { user } = useAuth();
    const titleId = useId();
    const [isScanning, setIsScanning] = useState(false);
    const [foundModels, setFoundModels] = useState<AIModel[]>([]);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
    const [hasInteracted, setHasInteracted] = useState(false);

    const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            const custom = readStoredArray<AIModel>('skyia_custom_models');
            const ids = new Set(custom.map((m: AIModel) => m.id));
            setAddedIds(ids);

            const history = getModelHistory();
            setHistoryIds(new Set(history));

            if (foundModels.length === 0) {
                handleScan();
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleScan = async () => {
        setIsScanning(true);
        const results = await discoverFreeModels();
        const custom = readStoredArray<AIModel>('skyia_custom_models');
        const ids = new Set(custom.map((m: AIModel) => m.id));
        setAddedIds(ids);

        setFoundModels(results);
        setIsScanning(false);
    };

    const handleToggle = (model: AIModel) => {
        setHasInteracted(true);
        const isInstalled = addedIds.has(model.id);

        if (isInstalled) {
            removeCustomModel(model.id);
            const newSet = new Set(addedIds);
            newSet.delete(model.id);
            setAddedIds(newSet);

            if (user) {
                removeCustomModelFromProfile(user.uid, model).then(() => {
                    debugLog('[CLOUD_SYNC] Model removed from profile.');
                });
            }
        } else {
            addCustomModel(model);
            setAddedIds(prev => new Set(prev).add(model.id));
            setHistoryIds(prev => new Set(prev).add(model.id));

            if (user) {
                saveCustomModelToProfile(user.uid, model).then(() => {
                    debugLog('[CLOUD_SYNC] Model added to profile.');
                });
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-2 md:p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-2xl bg-black border border-green-900 rounded-lg shadow-[0_0_50px_rgba(0,255,0,0.1)] flex flex-col h-[90vh] md:h-auto md:max-h-[85vh]"
            >
                <div className="p-3 md:p-4 border-b border-green-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                    <h2 id={titleId} className="text-green-500 font-display text-lg md:text-xl tracking-wider flex items-center gap-2 flex-1">
                        <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
                        DECOUVERTE RESEAU
                    </h2>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        {(hasInteracted || addedIds.size > 0) && (
                            <button
                                onClick={() => {
                                    sessionStorage.setItem('skyia_return_to_intro', 'true');
                                    window.location.reload();
                                }}
                                className="px-3 py-1.5 bg-red-900/20 border border-red-500 text-red-400 hover:bg-red-900/50 text-xs font-bold uppercase tracking-widest animate-pulse flex items-center gap-2"
                            >
                                <RefreshCw size={14} /> <span className="hidden md:inline">ACTUALISER</span>
                            </button>
                        )}

                        <button onClick={onClose} aria-label="Fermer la fenetre de decouverte reseau" className="p-1 text-gray-500 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="px-4 py-3 border-b border-green-900/30 flex flex-col md:flex-row gap-2 shrink-0">
                    <input
                        type="text"
                        placeholder="Rechercher un modele..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-black/50 border border-green-900/50 rounded px-3 py-2 text-sm text-green-400 placeholder-green-900/50 focus:outline-none focus:border-green-500 font-mono"
                    />
                    <div className="flex bg-black/50 rounded border border-green-900/50 p-1 overflow-x-auto min-w-0">
                        <button onClick={() => setFilter('all')} className={`flex-1 md:flex-none px-3 py-1 text-xs font-bold rounded whitespace-nowrap ${filter === 'all' ? 'bg-green-500 text-black' : 'text-green-600 hover:text-green-400'}`}>TOUS</button>
                        <button onClick={() => setFilter('free')} className={`flex-1 md:flex-none px-3 py-1 text-xs font-bold rounded whitespace-nowrap ${filter === 'free' ? 'bg-green-500 text-black' : 'text-green-600 hover:text-green-400'}`}>GRATUIT</button>
                        <button onClick={() => setFilter('paid')} className={`flex-1 md:flex-none px-3 py-1 text-xs font-bold rounded whitespace-nowrap ${filter === 'paid' ? 'bg-green-500 text-black' : 'text-green-600 hover:text-green-400'}`}>PREMIUM</button>
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto min-h-0">
                    <div className="bg-yellow-900/20 border border-yellow-900/50 p-3 rounded mb-4 flex gap-3">
                        <ShieldAlert className="text-yellow-500 shrink-0" size={24} />
                        <div className="text-xs text-yellow-200">
                            <strong>EXPERIMENTAL :</strong> Utilisation a vos risques. Les modeles decouverts ne sont pas certifies par Skyia Core.
                            Ils peuvent etre instables ou hors ligne. En cas d'erreur critique, utilisez le bouton "Reboot".
                        </div>
                    </div>

                    {foundModels.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500 mb-4 px-4">Scanner le reseau OpenRouter pour detecter de nouveaux modeles (payants et gratuits).</p>
                            <button
                                onClick={handleScan}
                                disabled={isScanning}
                                className="px-6 py-3 bg-green-900/20 border border-green-500 text-green-400 hover:bg-green-900/50 rounded transition-all uppercase tracking-widest font-bold flex items-center gap-2 mx-auto"
                            >
                                {isScanning ? <RefreshCw className="animate-spin" /> : <CloudDownload />}
                                {isScanning ? 'SCAN EN COURS...' : 'LANCER LE SCAN'}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-4">
                            {foundModels
                                .filter(m => {
                                    if (filter === 'free') return m.cost === 0;
                                    if (filter === 'paid') return m.cost > 0;
                                    return true;
                                })
                                .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(model => {
                                    const isInstalled = addedIds.has(model.id);
                                    const isHistory = historyIds.has(model.id);
                                    const isCurrent = currentModelId === model.id;

                                    return (
                                        <div
                                            key={model.id}
                                            className={`p-3 rounded border transition-all flex items-center justify-between group ${isCurrent
                                                ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.1)]'
                                                : isInstalled
                                                    ? 'bg-green-900/10 border-green-800/50'
                                                    : 'bg-black/40 border-gray-800 hover:border-gray-600 hover:bg-gray-900/40'
                                                }`}
                                        >
                                            <div className="flex flex-col flex-1 min-w-0 mr-3">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className={`font-bold text-sm truncate max-w-full ${isCurrent ? 'text-white' : 'text-green-400'}`}>
                                                        {model.name}
                                                    </span>
                                                    {isCurrent && <span className="text-[9px] text-red-500 font-bold tracking-widest bg-red-950/30 px-1 rounded border border-red-900/50 animate-pulse">ACTIVE</span>}
                                                    {model.cost === 0 ? (
                                                        <span className="text-[10px] bg-green-900/40 text-green-300 px-1.5 py-0.5 rounded border border-green-500/30">FREE</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-yellow-900/40 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/30">{model.cost} CR</span>
                                                    )}
                                                </div>
                                                <span className="text-gray-600 text-[10px] md:text-xs font-mono truncate">{model.id}</span>
                                            </div>

                                            <label className="cursor-pointer p-1 md:p-2 hover:bg-green-900/20 rounded transition-all group shrink-0">
                                                <div className={`w-8 h-8 border rounded flex items-center justify-center transition-all ${isInstalled
                                                    ? 'bg-green-500 border-green-500 text-black shadow-[0_0_10px_rgba(0,255,0,0.5)]'
                                                    : isHistory
                                                        ? 'border-blue-500/50 text-blue-400 bg-blue-900/10'
                                                        : 'border-gray-600 bg-black/50 text-gray-500 group-hover:border-green-500/50'
                                                    }`}>
                                                    {isInstalled ? (
                                                        <Check size={18} strokeWidth={3} />
                                                    ) : isHistory ? (
                                                        <CloudDownload size={18} />
                                                    ) : null}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={isInstalled}
                                                    onChange={() => handleToggle(model)}
                                                />
                                            </label>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscoveryModal;
