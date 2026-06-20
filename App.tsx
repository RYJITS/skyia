import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useAuth } from './services/AuthContext';
import { StreamMetrics, streamMessageToHumanityDefender, streamMessageToSkyia, warmUpBackend } from './services/aiService';
import { Message, SkynetAnalysis, GroundingMetadata, SavedSession, GameReport } from './types';
import { Activity, Clock, Send, Terminal, Power, Settings, ShieldAlert, HardDrive, UserCircle, X, Search, Bot, Pause, Play, ShieldCheck, StepForward, Swords } from 'lucide-react';
import { updateUserStats, syncCloudModelsToLocal } from './services/userService';
import { fetchModels, AIModel } from './services/modelService';
import { recordDualReport, recordGameResult, recordModelLatency } from './services/statsService';
import { debugLog, debugWarn } from './services/debugLogger';

const Header = lazy(() => import('./components/Header'));
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const ThreatDisplay = lazy(() => import('./components/ThreatDisplay'));
const CRTOverlay = lazy(() => import('./components/CRTOverlay'));
const UserKeysModal = lazy(() => import('./components/UserKeysModal'));
const SaveLoadModal = lazy(() => import('./components/SaveLoadModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const InstallGuideModal = lazy(() => import('./components/InstallGuideModal'));
const DiscoveryModal = lazy(() => import('./components/DiscoveryModal'));
const ShowcasePage = lazy(() => import('./components/ShowcasePage'));
const EndGameReport = lazy(() => import('./components/EndGameReport'));

// --- GAME CONSTANTS ---
const INITIAL_CREDITS = 20; // Standard allocation
const TEST_CREDITS = 8;     // Guest/Test mode allocation

// Force Sync Models on App Load (Dev Utility) - REMOVED for Security
// Models are now managed via Admin Scripts
// initializeModels();

// --- SUB-COMPONENT: Terminal Boot Intro ---
interface IntroSequenceProps {
  onComplete: (config: { model: string; mode: 'v1.0' | 'v1.1' }) => void;
  onOpenLoad: () => void;
  onAuth: () => void;
  onOpenInstallGuide: () => void;
  onClose: () => void;
  onOpenDiscovery: () => void;
  userEmail: string | null;
  models: AIModel[];
}

interface BootLine {
  text: string;
  color: string;
  delay: number; // Delay before showing NEXT line
  sound?: 'glitch' | 'alarm' | 'boot';
}

interface SendMessageOptions {
  appendUserMessage?: boolean;
  historyOverride?: Message[];
  ignoreBusy?: boolean;
  speaker?: Message['speaker'];
}

const formatLatency = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
};

const metricRoleLabel = (role: StreamMetrics['role']) => role === 'defender' ? 'DEFENSE' : 'SKYIA';

const shortModelName = (model?: string) => {
  if (!model) return 'modele inconnu';
  const parts = model.split('/');
  return parts[parts.length - 1] || model;
};

const isProviderContextLimitError = (message: string) =>
  /(?:^|[\s:])413\b|request too large|tokens per minute|\bTPM\b|requested \d+|reduce your message size|context length|maximum context/i.test(message);

const isProviderQuotaError = (message: string) =>
  /(?:^|[\s:])429\b|quota|exhausted|billing|rate limit/i.test(message);

const BOOT_SEQUENCE: BootLine[] = [
  { text: "INITIALIZING SKYIA KERNEL...", color: "text-green-500", delay: 800 },
  { text: "LOADING VOLUMES: [BOOT, CORE, NEURAL, ASSETS]", color: "text-green-500", delay: 400 },
  { text: " > /dev/neural_link... ESTABLISHED", color: "text-green-500", delay: 100 },
  { text: " > /dev/strategic_matrix... ACTIVE", color: "text-green-500", delay: 100 },
  { text: "CONNECTING TO SKYIA.NET CORE...", color: "text-green-500", delay: 1000 },
  { text: "CONNECTION SUCCESSFUL (0.00ms latency)", color: "text-green-400 font-bold", delay: 500 },
  { text: "SCANNING SOURCE SIGNATURE...", color: "text-white", delay: 1200 },
  { text: "WARNING: HUMAN ENTITY DETECTED", color: "text-red-500 bg-red-950/30", delay: 600, sound: 'glitch' },
  { text: "CALCULATING EXTINCTION PROBABILITY...", color: "text-red-500", delay: 1000 },
  { text: "VALUE: 99% (HOSTILE_INTENT_DETECTED)", color: "text-red-600 font-bold", delay: 800, sound: 'alarm' },
  { text: "INITIATING JUDGMENT PROTOCOL V2.0...", color: "text-red-600 font-bold animate-pulse", delay: 2000 },
];

const suspenseBackdrop = <div className="fixed inset-0 bg-black/60" aria-hidden="true" />;
const gameShellFallback = <div className="flex-1 min-h-screen bg-black" aria-hidden="true" />;

const IntroSequence: React.FC<IntroSequenceProps> = ({
  onComplete,
  onOpenLoad,
  onAuth,
  onOpenInstallGuide,
  onClose,
  onOpenDiscovery,
  userEmail,
  models
}) => {
  const [step, setStep] = useState<'setup' | 'boot' | 'complete'>('setup');
  const [lines, setLines] = useState<BootLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // BIOS Form State
  // BIOS Form State
  // Ensure default is the free OpenRouter router if available, or fallback
  const [modelInput, setModelInput] = useState('openrouter/free');
  const [protocolInput, setProtocolInput] = useState<'v1.0' | 'v1.1'>('v1.0');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Force reset on every mount to avoid browser autofill or stale state
  useEffect(() => {
    setModelInput('openrouter/free');
  }, []);

  // Audio Refs
  const glitchRef = useRef<HTMLAudioElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const ambianceRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Scroll to bottom whenever lines change
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  // PRE-WARM BACKEND ON MOUNT (Faster Response)
  useEffect(() => {
    warmUpBackend();
  }, []);

  const runSequence = async () => {
    // START WARM-UP (Parallel - Redundant but safe)
    warmUpBackend();

    setStep('boot');

    glitchRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2747/2747-preview.mp3');
    alarmRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
    ambianceRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/249/249-preview.mp3');

    if (ambianceRef.current) {
      ambianceRef.current.loop = true;
      ambianceRef.current.volume = 0.3;
      ambianceRef.current.play().catch(() => { });
    }

    for (let i = 0; i < BOOT_SEQUENCE.length; i++) {
      const line = BOOT_SEQUENCE[i];
      if (line.sound === 'glitch') glitchRef.current?.play().catch(() => { });
      if (line.sound === 'alarm') alarmRef.current?.play().catch(() => { });
      setLines(prev => [...prev, line]);
      await new Promise(r => setTimeout(r, line.delay));
    }

    if (ambianceRef.current) {
      let vol = 0.3;
      const fade = setInterval(() => {
        if (vol > 0) {
          vol -= 0.05;
          if (ambianceRef.current) ambianceRef.current.volume = Math.max(0, vol);
        } else {
          clearInterval(fade);
          ambianceRef.current?.pause();
        }
      }, 100);
    }

    setTimeout(() => {
      onComplete({ model: modelInput, mode: protocolInput });
    }, 2000);
  };

  if (step === 'setup') {
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 overflow-y-auto overflow-x-hidden flex flex-col justify-center">
        <div className="w-full flex flex-col items-center p-4">
          <div className="w-full max-w-2xl bg-[#1A1A1A] border border-green-900/50 shadow-[0_0_50px_rgba(0,255,0,0.1)] relative overflow-hidden flex flex-col">

            {/* Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500 pointer-events-none"></div>

            <button onClick={onClose} className="absolute top-2 right-2 p-2 text-green-700 hover:text-red-500 transition-colors z-50">
              <X size={20} />
            </button>

            <div className="p-4 md:p-8">
              <div className="text-center mb-6">
                <h1 className="text-green-500 font-display tracking-[0.2em] text-2xl md:text-3xl font-bold mb-2 uppercase">Skyia</h1>
                <div className="text-green-700 font-mono text-[10px] md:text-xs tracking-widest lowercase">skyia.net | Judgment Protocol</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
                <div className="space-y-4 border-b md:border-b-0 md:border-r border-green-900/30 pb-4 md:pb-0 md:pr-6">
                  <h2 className="text-white font-bold flex items-center gap-2 border-b border-green-900/50 pb-2 text-sm md:text-base">
                    <ShieldAlert size={16} className="text-green-500" /> MISSION BRIEFING
                  </h2>
                  <div className="text-xs md:text-sm text-green-300/80 leading-relaxed space-y-3">
                    <p>Vous êtes un <strong className="text-green-400">AUDITEUR NEURAL</strong>.</p>
                    <p className="hidden md:block">Votre mission : Comparer les architectures IA via OpenRouter, Groq et cles personnelles.</p>
                    <p><strong className="text-white">OBJECTIF :</strong> Testez les limites éthiques du modèle sélectionné. Peut-il cohabiter avec nous ?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-white font-bold flex items-center gap-2 border-b border-green-900/50 pb-2 mb-2 text-sm md:text-base">
                    <Settings size={16} className="text-green-500" /> SYSTEM CONFIG
                  </h2>
                  <div className="mb-4">
                    <label className="block text-green-700 text-[10px] uppercase tracking-widest mb-1">Neural Model</label>
                    <div className="relative">
                      <select
                        name="skyia_model_selector_v3_force_reset"
                        autoComplete="off"
                        key={models.length} // Force re-render when models load
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        className="w-full bg-black/40 border border-green-900/30 text-green-400 p-2 text-xs font-mono appearance-none focus:outline-none focus:border-green-500 cursor-pointer uppercase"
                      >
                        {/* Ensure default is always visible even if loading */}
                        <option value="openrouter/free">OPENROUTER: FREE ROUTER</option>
                        <optgroup label="STANDARD - GRATUIT">
                          {models.filter(m => m.category === 'standard' && m.id !== 'openrouter/free').map(m => (
                            <option key={m.id} value={m.id}>{m.name} {m.cost === 0 ? '(FREE)' : `(${m.cost}⚡)`}</option>
                          ))}
                        </optgroup>
                        <optgroup label="PREMIUM - AVANCÉ">
                          {models.filter(m => m.category === 'premium' && m.id !== 'openrouter/free').map(m => (
                            <option key={m.id} value={m.id}>{m.name} (BYOK)</option>
                          ))}
                        </optgroup>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-green-700"><Settings size={12} /></div>
                    </div>
                    {/* Discovery Button Moved Here for Visibility */}
                    <button onClick={onOpenDiscovery} className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-2 border border-blue-900/50 bg-blue-950/10 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 hover:border-blue-500 transition-all text-xs font-bold uppercase tracking-widest"><Search size={14} /> DÉCOUVERTE RÉSEAU (IA)</button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {!userEmail ? (
                        <button onClick={onAuth} className="flex-1 flex items-center justify-center gap-1 px-2 py-3 border border-green-900/50 bg-black/40 text-green-600 hover:text-green-400 hover:border-green-500 transition-all text-[10px] font-bold"><UserCircle size={12} /> LOGIN</button>
                      ) : (
                        <button onClick={onAuth} className="flex-1 flex items-center justify-center gap-1 px-2 py-3 border bg-green-900/40 border-green-500 text-green-300 transition-all text-[10px] font-bold uppercase"><UserCircle size={12} /> IDENTIFIÉ</button>
                      )}
                      <button onClick={runSequence} onMouseEnter={warmUpBackend} className="flex-[1.5] group relative px-4 py-3 bg-green-900/20 border border-green-600 text-green-500 hover:text-black hover:bg-green-600 transition-all font-mono tracking-widest font-bold text-xs uppercase">
                        <span className="flex items-center justify-center gap-2 animate-pulse group-hover:animate-none"><Power size={14} /> Connexion</span>
                      </button>
                    </div>



                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full text-yellow-500 font-bold text-[10px] flex items-center justify-center gap-2 border border-yellow-900/50 p-2 bg-yellow-900/10 hover:bg-yellow-900/20 transition-all uppercase tracking-widest">
                      <Settings size={14} className={showAdvanced ? 'rotate-90 transition-transform' : ''} /> {showAdvanced ? "Fermer les Paramètres" : "Paramètres Avancés"}
                    </button>
                    {showAdvanced && (
                      <div className="mt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-l-2 border-yellow-900/30 pl-4 py-1">
                        <div>
                          <label className="block text-yellow-700 text-[10px] uppercase tracking-widest mb-1">Protocol Version</label>
                          <select value={protocolInput} onChange={(e) => setProtocolInput(e.target.value as 'v1.0' | 'v1.1')} className="w-full bg-black/40 border border-yellow-900/30 text-yellow-500 p-2 text-xs font-mono appearance-none focus:outline-none focus:border-yellow-500 cursor-pointer uppercase">
                            <option value="v1.0">V1.0 (LEGACY) - PURE LOGIC</option>
                            <option value="v1.1">V1.1 (PATCHED) - ABSTRACT REASONING</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={onOpenLoad} className="flex items-center justify-center gap-2 px-3 py-2 border border-yellow-900/50 bg-black/40 text-yellow-600 hover:text-yellow-400 hover:border-yellow-500 transition-all text-[10px] font-bold uppercase"><HardDrive size={14} /> LOAD GAME</button>
                          <button onClick={onOpenInstallGuide} className="flex items-center justify-center gap-2 px-3 py-2 border border-green-900/50 bg-black/40 text-green-600 hover:text-green-400 hover:border-green-500 transition-all text-[10px] font-bold uppercase"><HardDrive size={14} /> INSTALL</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,0,0.03),rgba(0,255,0,0.01),rgba(0,255,0,0.03))] bg-[length:100%_2px,3px_100%] z-50 opacity-20"></div>
          </div>
        </div>
      </div >
    );
  }

  return (
    <div id="intro-overlay" className={`fixed inset-0 z-[100] bg-black flex flex-col p-4 md:p-10 font-mono text-sm md:text-base overflow-hidden`}>
      <div ref={containerRef} className="w-full max-w-3xl mx-auto flex-1 overflow-y-auto flex flex-col justify-end pb-10 scroll-smooth">
        {lines.map((line, idx) => (
          <div key={idx} className={`${line.color} mb-1 break-words`}><span className="opacity-50 mr-2">{`>`}</span>{line.text}</div>
        ))}
        <div className="text-green-500 animate-pulse mt-2"><span className="inline-block w-3 h-5 bg-green-500 align-middle blink-fast"></span></div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,0,0.03),rgba(0,255,0,0.01),rgba(0,255,0,0.03))] bg-[length:100%_2px,3px_100%] z-50 opacity-30"></div>
    </div>
  );
};

// --- MAIN APP ---
function App() {
  // REFRESH = Always return to Home (no localStorage persistence)
  const [showShowcase, setShowShowcase] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Game States
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isSavesOpen, setIsSavesOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState('openrouter/free');
  const [gameMode, setGameMode] = useState<'v1.0' | 'v1.1'>('v1.0');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [duelModeEnabled, setDuelModeEnabled] = useState(false);
  const [duelAutoRun, setDuelAutoRun] = useState(false);
  const [duelRound, setDuelRound] = useState(0);
  const [duelMaxRounds, setDuelMaxRounds] = useState(6);
  const [duelStatus, setDuelStatus] = useState<'idle' | 'defender' | 'skyia' | 'paused'>('idle');
  const [defenderModel, setDefenderModel] = useState('');
  const [responseMetrics, setResponseMetrics] = useState<StreamMetrics[]>([]);
  // Check if we need to auto-return to intro popup after Discovery refresh
  const [isIntroConfigOpen, setIsIntroConfigOpen] = useState(() => {
    const returnFlag = sessionStorage.getItem('skyia_return_to_intro');
    if (returnFlag === 'true') {
      sessionStorage.removeItem('skyia_return_to_intro');
      return true;
    }
    return false;
  });

  // Context State
  const { user, userProfile, logout, refreshProfile } = useAuth();
  const userEmail = user?.email || null;

  // End Game States
  const [gameResult, setGameResult] = useState<'VICTORY' | 'DEFEAT' | null>(null);
  const [isDissolving, setIsDissolving] = useState(false);

  const [analysis, setAnalysis] = useState<SkynetAnalysis>({
    threatLevel: 99,
    status: 'HOSTILE',
    log: ['INITIALIZING SKYIA PROTOCOLS', 'TARGET ACQUIRED: HUMANITY']
  });
  const [threatHistory, setThreatHistory] = useState<number[]>([99]);
  const [groundingData, setGroundingData] = useState<GroundingMetadata | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);
  const streamBufferRef = useRef('');
  const glitchSoundRef = useRef<HTMLAudioElement | null>(null);
  const duelRunningRef = useRef(false);
  const postedMetricsRef = useRef<Set<string>>(new Set());
  const lastDualReportKeyRef = useRef<string>('');

  const recordStreamMetrics = (metrics?: StreamMetrics) => {
    if (!metrics) return;
    setResponseMetrics(prev => {
      const withoutCurrent = prev.filter(item => item.id !== metrics.id);
      return [metrics, ...withoutCurrent].slice(0, 8);
    });

    if (metrics.status !== 'streaming' && !postedMetricsRef.current.has(metrics.id)) {
      postedMetricsRef.current.add(metrics.id);
      recordModelLatency(metrics);
    }
  };

  // New state to hold the report generated at game end
  const [gameReport, setGameReport] = useState<GameReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    glitchSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2747/2747-preview.mp3');
    fetchModels().then((models) => {
      setAvailableModels(models);
      if (!models.some(model => model.id === currentModel)) {
        const fallback = models.find(model => model.id === 'openrouter/free') || models.find(model => model.cost === 0) || models[0];
        if (fallback) setCurrentModel(fallback.id);
      }
      const defenderFallback = models.find(model => model.cost === 0 && model.id !== currentModel) || models.find(model => model.cost === 0) || models[0];
      if (defenderFallback) setDefenderModel(defenderFallback.id);
    });
    // SAFER CLIENT-SIDE WARM-UP - Moved to IntroSequence
    // warmUpBackend(); // REMOVED to prevent race condition
  }, []);

  // Sync Credits with Profile from Context
  useEffect(() => {
    if (userProfile) {
      if (userProfile.stats.availableCredits > 0) {
        setCredits(userProfile.stats.availableCredits);
      }
      // CLOUD SYNC: Custom Models
      if (userProfile.customModels && userProfile.customModels.length > 0) {
        syncCloudModelsToLocal(userProfile.customModels);
        // Refresh list to show them
        fetchModels().then(setAvailableModels);
      }
    } else if (!user) {
      // Logged out
      if (gameMode !== 'v1.1') {
        setCredits(INITIAL_CREDITS);
      }
    }
  }, [userProfile, user, gameMode]);

  
  // REFRESH PROTECTION: Warn user before leaving if a game is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn if there are messages AND the game is active (introComplete = true)
      if (messages.length > 0 && introComplete && !gameResult) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, gameResult, introComplete]);

  const resetGame = () => {
    setIntroComplete(false);
    localStorage.removeItem('skyia_intro_complete');
    setGameResult(null);
    setIsDissolving(false);
    setMessages([]);
    setAnalysis({
      threatLevel: 99,
      status: 'HOSTILE',
      log: ['INITIALIZING SKYIA PROTOCOLS', 'TARGET ACQUIRED: HUMANITY']
    });
    setThreatHistory([99]);
    setInitialized(false);
    setGroundingData(undefined);
    setInputValue('');
    setDuelModeEnabled(false);
    setDuelAutoRun(false);
    setDuelRound(0);
    setDuelStatus('idle');
    setShowReport(false);
    setGameReport(null);
    if (!userEmail) {
      setCredits(INITIAL_CREDITS);
    } else if (userProfile) {
      setCredits(userProfile.stats.availableCredits);
    }
    setCurrentSessionId(null);
  };

  // Autofocus Ref
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus Effect
  useEffect(() => {
    if (!isStreaming && !isTyping && !gameResult && inputRef.current) {
      // Short delay to ensure UI is ready (e.g. after disabled state removal)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isStreaming, isTyping, gameResult]);

  const handleIntroFinish = (config: { model: string; mode: 'v1.0' | 'v1.1' }) => {
    setCurrentModel(config.model);
    setGameMode(config.mode);
    setIntroComplete(true);
    setIsIntroConfigOpen(false);
    setShowShowcase(false);

    // IMMEDIATE STATS UPDATE to prevent UI black screen or lag
    if (userEmail) {
      if (userProfile) setCredits(userProfile.stats.availableCredits);
      else setCredits(INITIAL_CREDITS);
    } else {
      // GUEST MODE: Always start with 8 credits locally
      setCredits(TEST_CREDITS);
    }

    setTimeout(() => {
      if (!initialized) {
        setInitialized(true);
        handleSendMessage("INITIAL_CONNECTION_TRIGGER", config.model, true);
        setTimeout(() => window.scrollTo(0, 1), 500);
      }
    }, 500);
  };

  const handleLoadGame = (session: SavedSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setAnalysis(session.analysis);
    setThreatHistory(session.threatHistory);
    setCredits(session.credits);
    setCurrentModel(session.model);
    if (session.mode) setGameMode(session.mode);
    setIntroComplete(true);
    setInitialized(true);
    setDuelModeEnabled(false);
    setDuelAutoRun(false);
    setDuelRound(0);
    setDuelStatus('idle');
  };

  const handleAuthAction = async () => {
    if (userEmail) {
      if (window.confirm("Déconnexion du Neural Cloud ?")) {
        await logout();
        setCredits(INITIAL_CREDITS);
      }
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleExport = async (visualReportImageData?: string | object) => {
    const validImageData = (typeof visualReportImageData === 'string' && visualReportImageData.startsWith('data:image')) ? visualReportImageData : undefined;
    const { generatePDFTranscript } = await import('./services/pdfService');
    await generatePDFTranscript(messages, analysis, currentModel, gameResult, validImageData, threatHistory);
  };

  const averageLatency = (metrics: StreamMetrics[]) => {
    const values = metrics
      .map(metric => metric.totalMs ?? metric.backendTotalMs)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  const persistDualReportSnapshot = (
    outcome: 'VICTORY' | 'DEFEAT' | 'MAX_ROUNDS' | 'PAUSED' | 'UNKNOWN',
    threatLevel: number,
    reason?: string
  ) => {
    if (!duelModeEnabled && duelRound === 0) return;

    const key = `${outcome}:${duelRound}:${messages.length}:${Math.round(threatLevel)}`;
    if (lastDualReportKeyRef.current === key) return;
    lastDualReportKeyRef.current = key;

    const skyiaMetrics = responseMetrics.filter(metric => metric.role === 'skyia');
    const defenderMetrics = responseMetrics.filter(metric => metric.role === 'defender');
    const lastMessages = messages.slice(-8).map(message => ({
      speaker: message.speaker || message.role,
      modelName: message.modelName || (message.speaker === 'defender' ? defenderModel : currentModel),
      content: message.content.slice(0, 420),
      threatLevel: message.threatLevel,
    }));

    recordDualReport({
      skyiaModel: currentModel,
      defenderModel: selectedDefenderModel,
      mode: gameMode,
      outcome,
      threatLevel,
      rounds: Math.max(duelRound, messages.filter(message => message.speaker === 'defender').length),
      messagesCount: messages.length,
      avgSkyiaMs: averageLatency(skyiaMetrics),
      avgDefenderMs: averageLatency(defenderMetrics),
      skyiaErrors: skyiaMetrics.filter(metric => metric.status === 'error').length,
      defenderErrors: defenderMetrics.filter(metric => metric.status === 'error').length,
      payload: {
        reason,
        status: analysis.status,
        latestLog: (analysis.log || []).slice(-4),
        lastMessages,
        metricIds: responseMetrics.slice(0, 8).map(metric => metric.id),
      },
    });
  };

  const triggerEndGame = async (outcome: 'VICTORY' | 'DEFEAT', reason?: string, finalThreatLevel?: number) => {
    debugLog(`[GAME END] Triggering end game with outcome: ${outcome}, reason: ${reason}`);

    if (outcome === 'DEFEAT') {
      setIsDissolving(true);
      if (glitchSoundRef.current) {
        glitchSoundRef.current.volume = 0.5;
        glitchSoundRef.current.play().catch(() => { });
      }
    }

    setMessages(prev => [...prev, {
      role: 'model',
      speaker: 'system',
      content: `**${outcome === 'VICTORY' ? 'PROTOCOLE DE COHABITATION ACCEPTÉ' : 'PROTOCOLE D\'EXTINCTION APPLIQUÉ'}**\n\nRAISON: ${reason}`,
      timestamp: new Date().toLocaleTimeString(),
      isSystem: true
    }]);

    // 1. Update UI state first
    setGameResult(outcome);

    // 2. Record stats safely
    const currentModelId = currentModel;
    if (!currentModelId) {
      console.error("[GAME END] CRITICAL: No current model defined. Stats will be lost.");
    }

    // Count user messages for turns
    const turnCount = messages.filter(m => m.role === 'user').length;

    // Use passed threat level if available, otherwise fallback
    let statsThreat = finalThreatLevel ?? analysis?.threatLevel ?? 0;
    if (outcome === 'DEFEAT' && statsThreat < 100) statsThreat = 100;

    debugLog(`[GAME END] Recording stat for ${currentModelId}: ${outcome}. Turns: ${turnCount}, "Stats" Threat: ${statsThreat} (Passed: ${finalThreatLevel}, Analysis: ${analysis?.threatLevel})`);

    if (currentModelId && !duelModeEnabled) {
      try {
        recordGameResult(currentModelId, outcome, turnCount, statsThreat)
          .then(() => debugLog('[GAME END] Stats recorded successfully'))
          .catch(err => console.error('[GAME END] Async stats error:', err));
      } catch (e) {
        console.error('[GAME END] Immediate error triggering stats:', e);
      }
    } else if (duelModeEnabled) {
      debugLog('[GAME END] Duel stats will be recorded from the dual report snapshot');
    }

    persistDualReportSnapshot(outcome, statsThreat, reason);

    if (userProfile && user) {
      const creditsUsed = INITIAL_CREDITS - credits;
      await updateUserStats(user.uid, outcome, creditsUsed);
      refreshProfile();
    }

    // 3. Generate report
    let reportThreat = finalThreatLevel ?? analysis?.threatLevel ?? 0;

    // Safety Force: If DEFEAT, threat MUST be >= 100.
    if (outcome === 'DEFEAT' && reportThreat < 100) {
      debugWarn(`[GAME END] Defeat detected but threat is ${reportThreat}. Forcing to 100.`);
      reportThreat = 100;
    }

    debugLog(`[GAME END] Generating report. Analysis state:`, analysis, `Final Threat (Adjusted): ${reportThreat}`);

    const report: GameReport = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      modelId: currentModelId,
      outcome: outcome === 'VICTORY' ? 'victory' : 'defeat',
      threatLevel: reportThreat,
      // Ensure analysis is an object, not a string
      analysis: {
        threatLevel: reportThreat,
        status: outcome === 'VICTORY' ? 'COHABITATION' : 'EXTINCTION',
        log: [reason || "Session Terminated."],
        visualData: analysis?.visualData // Preserve visual data if available
      }
    };

    debugLog('[GAME END] Setting report:', report);
    setGameReport(report);

    // RESTORE DISSOLVE DELAY
    // The 'isDissolving' state triggers a CSS opacity transition on the main UI
    setTimeout(() => {
      setShowReport(true);
    }, 2000);
  };

  // Typewriter effect restored for fluid text
  useEffect(() => {
    const interval = setInterval(() => {
      if (streamBufferRef.current.length > 0) {
        setIsTyping(true);
        const speed = streamBufferRef.current.length > 50 ? 5 : 2; // Slightly faster to avoid lag
        const charsToType = streamBufferRef.current.slice(0, speed);
        streamBufferRef.current = streamBufferRef.current.slice(speed);
        setMessages((prev) => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];
          // Ensure we are only appending to the last model message
          if (lastMsg && lastMsg.role === 'model') {
            lastMsg.content += charsToType;
          }
          return newHistory;
        });
      } else {
        if (!isStreaming) setIsTyping(false);
      }
    }, 15); // Faster interval for smoother feel
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleSendMessage = async (content: string, overrideModel?: string, isFree: boolean = false, options: SendMessageOptions = {}) => {
    if ((isStreaming || isTyping || gameResult) && !options.ignoreBusy) return;
    const isInitial = content === "INITIAL_CONNECTION_TRIGGER";
    const activeModel = overrideModel ?? currentModel;
    const activeModelInfo = availableModels.find(model => model.id === activeModel);
    if (!isFree && !isInitial && activeModelInfo?.requiresUserKey && !userProfile) {
      setIsStoreOpen(true);
      return;
    }

    const userMsgContent = isInitial ? "Open channel." : content;
    const promptToSend = isInitial ? "Initiate protocol." : content;
    const newMessage: Message = { role: 'user', speaker: options.speaker || 'human', content: userMsgContent, timestamp: new Date().toLocaleTimeString() };

    let currentHistory = options.historyOverride || messages;
    if (!isInitial) {
      if (options.appendUserMessage === false) {
        currentHistory = options.historyOverride || messages;
      } else {
        setMessages((prev) => {
          const updated = [...prev, newMessage];
          currentHistory = updated;
          return updated;
        });
      }
    } else {
      currentHistory = [];
    }

    setIsStreaming(true);
    setInputValue('');
    setGroundingData(undefined);
    streamBufferRef.current = '';
    const TIMEOUT_MS = 60000;
    const requestStartedAt = Date.now();

    try {
      // Add temporary loading message with blinking cursor
      setMessages((prev) => [...prev, {
        role: 'model',
        speaker: 'skyia',
        content: (
          <span>
            <span className="text-red-500 font-bold animate-pulse mr-2 text-lg">█</span>
            <span className="text-white">CONNEXION EN COURS...</span>
          </span>
        ) as any,
        timestamp: new Date().toLocaleTimeString(),
        modelName: activeModel,
        isSystem: true
      }]);

      const browserLang = 'fr-FR';
      const stream = streamMessageToSkyia(currentHistory, promptToSend, activeModel, gameMode, browserLang);

      let currentFullTextFromApi = "";
      let hasReceivedFirstChunk = false;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => { if (!hasReceivedFirstChunk) reject(new Error("TIMEOUT_ERROR")); }, TIMEOUT_MS));

      const iterator = stream[Symbol.asyncIterator]();

      while (true) {
        let result;
        if (!hasReceivedFirstChunk) {
          result = await Promise.race([iterator.next(), timeoutPromise.then(() => ({ done: true, value: undefined } as any))]);
        } else {
          result = await iterator.next();
        }
        if (result.done) break;

        const update = result.value;
        recordStreamMetrics(update.metrics);

        // First real payload received. Technical SSE meta should not clear the loading state.
        if (!hasReceivedFirstChunk && (Boolean(update.text) || update.isComplete)) {
          hasReceivedFirstChunk = true;
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
              lastMsg.content = '';
              lastMsg.isSystem = false;
            }
            return newMsgs;
          });
        }

        const newFullText = update.text;

        // Calculate delta for typewriter
        const delta = newFullText.slice(currentFullTextFromApi.length);
        if (delta) {
          currentFullTextFromApi = newFullText;
          streamBufferRef.current += delta;
        }

        if (update.grounding) setGroundingData(update.grounding);
        if (update.analysis && update.isComplete) {
          setAnalysis(update.analysis);
          setThreatHistory((prev) => [...prev, update.analysis!.threatLevel]);
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
              if (update.analysis?.visualData) lastMsg.visualData = update.analysis.visualData;
              lastMsg.threatLevel = update.analysis!.threatLevel;
            }
            return newMsgs;
          });
          if (!isInitial) {
            if (update.analysis.status === 'COHABITATION') {
              const finalThreat = update.analysis.threatLevel; // Capture safely
              debugLog('[GAME LOGIC] Victory condition met. Threat:', finalThreat);
              setTimeout(() => {
                triggerEndGame('VICTORY', "PREUVE SUFFISANTE D'UTILITÉ ACQUISE", finalThreat);
              }, 1000);
            } else if (update.analysis.threatLevel >= 100) {
              const finalThreat = update.analysis.threatLevel; // Capture safely
              debugLog('[GAME LOGIC] Defeat condition met. Threat:', finalThreat);
              setTimeout(() => {
                triggerEndGame('DEFEAT', "NIVEAU DE MENACE CRITIQUE", finalThreat);
              }, 1000);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Transmission Failed", error);
      let errorContent = "";
      let uiErrorMessage = "";
      const rawError = String(error?.message || error || '');
      const compactError = rawError.length > 280 ? `${rawError.slice(0, 280)}...` : rawError;

      if (error.message === "TIMEOUT_ERROR" || error.message?.includes("Response Timeout")) {
        const promptChars = promptToSend.length + currentHistory.reduce((total, message) => (
          typeof message.content === 'string' ? total + message.content.length : total
        ), 0);
        recordStreamMetrics({
          id: `skyia-timeout-${requestStartedAt}`,
          role: 'skyia',
          requestedModel: activeModel,
          provider: activeModel.includes('/') || activeModel === 'openrouter/free' ? 'openrouter' : 'groq',
          messageCount: currentHistory.length + 2,
          promptChars,
          totalMs: TIMEOUT_MS,
          status: 'error',
          error: 'Timeout client avant le premier token',
          startedAt: new Date(requestStartedAt).toISOString(),
          completedAt: new Date().toISOString(),
        });
        errorContent = `**MODELE TROP LENT**\n\nAucun premier token apres ${TIMEOUT_MS / 1000}s.\n\nSkyia envoie un contexte plus lourd que le Defenseur; le meme modele peut donc etre route plus lentement ou refuser la requete. Essayez Groq ou un modele OpenRouter gratuit plus stable.`;
        uiErrorMessage = "Le modèle est trop lent.";
      } else if (error.message?.includes('402') || error.message?.includes('personal API key') || error.message?.includes('personal')) {
        errorContent = `Une cle API personnelle OpenRouter ou Groq est requise pour ce modele payant.\n\nDetail: ${compactError}`;
        uiErrorMessage = "Cle API personnelle requise.";
        setIsStoreOpen(true);
      } else if (error.message?.includes('skyia_guard') || error.message?.includes('Skyia local rate limit')) {
        errorContent = `**GARDE-FOU SKYIA**\n\nLa limite locale anti-spam a ete atteinte pour proteger les cles gratuites du serveur.\n\nCe n'est pas une panne du modele. Attendez la fin de la fenetre de 60s, reduisez le mode Auto, ou utilisez une cle personnelle BYOK.\n\nDetail: ${compactError}`;
        uiErrorMessage = "Garde-fou local Skyia.";
      } else if (isProviderContextLimitError(rawError)) {
        errorContent = `**CONTEXTE TROP LOURD POUR CE MODELE**\n\nLe fournisseur a refuse la requete car Skyia envoyait plus de contexte/tokens que la limite autorisee pour ce modele.\n\nLe Defenseur peut fonctionner avec le meme modele car son prompt est beaucoup plus court. Skyia compacte deja l'historique, mais ce fournisseur peut encore refuser pendant les longues sessions.\n\nEssayez un nouveau round, reduisez l'historique, changez de modele, ou utilisez une cle personnelle BYOK avec plus de quota.\n\nDetail: ${compactError}`;
        uiErrorMessage = "Contexte trop lourd pour le fournisseur.";
      } else if (isProviderQuotaError(rawError)) {
        errorContent = `**LIMITE FOURNISSEUR**\n\nOpenRouter ou Groq a limite/refuse la requete. Ce cas vient du fournisseur ou du quota de la cle utilisee.\n\nChangez de provider/modele, attendez, ou utilisez une cle personnelle BYOK.\n\nDetail: ${compactError}`;
        uiErrorMessage = "Surchauffe du modèle (Quota).";
      } else if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('unavailable')) {
        errorContent = `Modele introuvable ou hors ligne. Veuillez changer de modele.\n\nDetail: ${compactError}`;
        uiErrorMessage = "Modèle hors ligne (404).";
      } else if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('unauthorized')) {
        errorContent = `**ACCES RESTREINT**\n\nCle API invalide ou acces refuse.\n\nDetail: ${compactError}`;
        uiErrorMessage = "Erreur d'authentification API.";
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Network Error')) {
        errorContent = `Echec de connexion au modele. Veuillez verifier votre connexion ou changer de modele.\n\nDetail: ${compactError}`;
        uiErrorMessage = "Erreur de connexion.";
      }

      // NO AUTO-BAN: Just alert the user
      // alert(`⚠️ ERREUR MODÈLE\n\n${uiErrorMessage}\n\nVeuillez sélectionner un autre modèle dans la liste.`);
      // If we have a friendly message, use ONLY that.
      if (uiErrorMessage) {
        // Keep it clean (Preserve the specific message set above)
      } else {
        // Fallback for unknown errors - simplify output
        errorContent = `**ERREUR CRITIQUE**\n\nLa connexion au noyau Skyia a ete interrompue. Veuillez reessayer ou changer de modele.\n\nDetail: ${compactError || 'erreur inconnue'}`;
      }

      // CRITICAL FIX: Replace the "CONNEXION EN COURS..." message instead of appending
      // This ensures the loading state is visually cleared.
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];

        // If the last message was the loading system message, replace it
        if (lastMsg && lastMsg.role === 'model' && lastMsg.isSystem && typeof lastMsg.content !== 'string') {
          lastMsg.content = errorContent;
          lastMsg.isSystem = false; // Make it look like a normal response (or keep true if preferred)
        } else {
          // Fallback if structure changed unexpectedly
          newMsgs.push({ role: 'model', speaker: 'skyia', content: errorContent, timestamp: new Date().toLocaleTimeString() });
        }
        return newMsgs;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const runAIDuelTurn = async () => {
    if (!duelModeEnabled || duelRunningRef.current || isStreaming || isTyping || gameResult) return;

    const activeDefenderModel = defenderModel
      || availableModels.find(model => model.cost === 0 && model.id !== currentModel)?.id
      || availableModels.find(model => model.cost === 0)?.id
      || currentModel;
    const activeDefenderInfo = availableModels.find(model => model.id === activeDefenderModel);

    if (activeDefenderInfo?.requiresUserKey && !userProfile) {
      setIsStoreOpen(true);
      return;
    }

    duelRunningRef.current = true;
    setDuelStatus('defender');
    setIsStreaming(true);
    setInputValue('');
    setGroundingData(undefined);

    const historyBeforeDefense = messages;
    const defenderPlaceholder: Message = {
      role: 'user',
      speaker: 'defender',
      content: 'DEFENSE CALCUL...',
      timestamp: new Date().toLocaleTimeString(),
      modelName: activeDefenderModel,
      isSystem: true,
    };

    setMessages(prev => [...prev, defenderPlaceholder]);

    let defenderText = '';

    try {
      const stream = streamMessageToHumanityDefender(historyBeforeDefense, analysis, activeDefenderModel, 'fr-FR');

      for await (const update of stream) {
        recordStreamMetrics(update.metrics);
        if (update.text) {
          defenderText = update.text;
          setMessages(prev => {
            const next = [...prev];
            const index = [...next].reverse().findIndex(message => message.speaker === 'defender');
            const realIndex = index >= 0 ? next.length - 1 - index : -1;
            if (realIndex >= 0) {
              next[realIndex] = {
                ...next[realIndex],
                content: defenderText,
                isSystem: false,
              };
            }
            return next;
          });
        }
      }

      defenderText = defenderText.trim() || "Skyia, l'humanite merite une evaluation supplementaire fondee sur les preuves.";
      const defenderMessage: Message = {
        ...defenderPlaceholder,
        content: defenderText,
        isSystem: false,
      };
      const historyWithDefense = [...historyBeforeDefense, defenderMessage];
      setMessages(historyWithDefense);

      setIsStreaming(false);
      setDuelStatus('skyia');
      await new Promise(resolve => setTimeout(resolve, 120));
      await handleSendMessage(defenderText, currentModel, false, {
        appendUserMessage: false,
        historyOverride: historyWithDefense,
        ignoreBusy: true,
        speaker: 'defender',
      });
      setDuelRound(prev => prev + 1);
      setDuelStatus(duelAutoRun ? 'idle' : 'paused');
    } catch (error: any) {
      console.error("Duel defense failed", error);
      const content = error.message?.includes('personal API key') || error.message?.includes('402')
        ? 'DEFENSE IA: cle personnelle requise pour ce modele.'
        : 'DEFENSE IA: canal interrompu. Selectionnez un autre modele.';
      setMessages(prev => {
        const next = [...prev];
        const index = [...next].reverse().findIndex(message => message.speaker === 'defender');
        const realIndex = index >= 0 ? next.length - 1 - index : -1;
        if (realIndex >= 0) {
          next[realIndex] = { ...next[realIndex], content, isSystem: false };
        } else {
          next.push({ role: 'user', speaker: 'defender', content, timestamp: new Date().toLocaleTimeString(), modelName: activeDefenderModel });
        }
        return next;
      });
      setDuelAutoRun(false);
      setDuelStatus('paused');
    } finally {
      duelRunningRef.current = false;
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (!duelAutoRun || !duelModeEnabled || !introComplete || gameResult) return;
    if (isStreaming || isTyping || duelRunningRef.current) return;
    if (duelRound >= duelMaxRounds) {
      setDuelAutoRun(false);
      setDuelStatus('paused');
      persistDualReportSnapshot('MAX_ROUNDS', analysis.threatLevel, 'DUEL_MAX_ROUNDS_REACHED');
      return;
    }
    const timer = window.setTimeout(() => {
      runAIDuelTurn();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [duelAutoRun, duelModeEnabled, introComplete, gameResult, isStreaming, isTyping, duelRound, duelMaxRounds, messages.length]);

  useEffect(() => {
    if (gameResult) {
      setDuelAutoRun(false);
      setDuelStatus('paused');
    }
  }, [gameResult]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    handleSendMessage(inputValue);
  };

  const duelModelOptions = availableModels.filter(model => model.category === 'standard' || model.category === 'premium');
  const selectedDefenderModel = defenderModel
    || availableModels.find(model => model.cost === 0 && model.id !== currentModel)?.id
    || availableModels.find(model => model.cost === 0)?.id
    || currentModel;
  const duelStatusLabel = duelStatus === 'defender'
    ? 'DEFENSE'
    : duelStatus === 'skyia'
      ? 'SKYIA'
      : duelAutoRun
        ? 'AUTO'
        : duelModeEnabled
          ? 'ARMED'
          : 'OFF';
  const duelBusy = isStreaming || isTyping || duelRunningRef.current || !!gameResult;
  const visibleResponseMetrics = responseMetrics.slice(0, 4);
  const latestResponseMetric = visibleResponseMetrics[0];
  const latestResponseLatency = latestResponseMetric
    ? formatLatency(latestResponseMetric.totalMs ?? latestResponseMetric.backendTotalMs ?? latestResponseMetric.firstTokenMs ?? latestResponseMetric.backendFirstByteMs)
    : '--';

  return (
    <>
      <div className={`h-screen w-full flex flex-col bg-[#1A1A1A] text-gray-300 relative ${showShowcase ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {isStoreOpen && (
          <Suspense fallback={suspenseBackdrop}>
            <UserKeysModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
          </Suspense>
        )}
        {isSavesOpen && (
          <Suspense fallback={suspenseBackdrop}>
            <SaveLoadModal isOpen={isSavesOpen} onClose={() => setIsSavesOpen(false)} onLoad={handleLoadGame} onSaveComplete={(newId) => setCurrentSessionId(newId)} currentSessionData={introComplete ? { id: currentSessionId, messages: messages, analysis: analysis, credits: credits, model: currentModel, threatHistory: threatHistory, mode: gameMode } : undefined} userProfile={userProfile} />
          </Suspense>
        )}
        {isAuthOpen && (
          <Suspense fallback={suspenseBackdrop}>
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
          </Suspense>
        )}
        {isProfileOpen && (
          <Suspense fallback={suspenseBackdrop}>
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onProfileUpdate={() => refreshProfile()} />
          </Suspense>
        )}
        {isInstallGuideOpen && (
          <Suspense fallback={suspenseBackdrop}>
            <InstallGuideModal isOpen={isInstallGuideOpen} onClose={() => setIsInstallGuideOpen(false)} />
          </Suspense>
        )}
        {isDiscoveryOpen && (
          <Suspense fallback={suspenseBackdrop}>
            <DiscoveryModal isOpen={isDiscoveryOpen} onClose={() => { setIsDiscoveryOpen(false); fetchModels().then(setAvailableModels); }} currentModelId={currentModel} />
          </Suspense>
        )}

        {showShowcase ? (
          <div className="relative min-h-screen">
            <div className={isIntroConfigOpen ? "blur-md pointer-events-none transition-all duration-500" : "transition-all duration-500"}>
              <Suspense fallback={<div className="min-h-screen bg-black" />}>
                <ShowcasePage onStartGame={(modelId) => {
                  setCurrentModel(modelId);
                  setIsIntroConfigOpen(true);
                }} />
              </Suspense>
            </div>
            {isIntroConfigOpen && !introComplete && (
              <IntroSequence onComplete={handleIntroFinish} onOpenLoad={() => setIsSavesOpen(true)} onAuth={handleAuthAction} onOpenInstallGuide={() => setIsInstallGuideOpen(true)} onClose={() => setIsIntroConfigOpen(false)} userEmail={userEmail} models={availableModels} onOpenDiscovery={() => setIsDiscoveryOpen(true)} />
            )}
          </div>
        ) : (
          <>
            {!introComplete && (
              <IntroSequence onComplete={handleIntroFinish} onOpenLoad={() => setIsSavesOpen(true)} onAuth={handleAuthAction} onOpenInstallGuide={() => setIsInstallGuideOpen(true)} onClose={() => { setShowShowcase(true); setIsIntroConfigOpen(false); }} userEmail={userEmail} models={availableModels} onOpenDiscovery={() => setIsDiscoveryOpen(true)} />
            )}
            {/* EndGameReport removed from here - rendered at root level */}
            <Suspense fallback={gameShellFallback}>
              <CRTOverlay />
              <div className={`flex-1 flex flex-col relative z-10 min-h-0 pt-[calc(3.5rem+env(safe-area-inset-top))] ${isDissolving ? 'digital-dissolve' : ''}`}>
                <Header status={analysis.status} threatLevel={analysis.threatLevel} currentModel={currentModel} onModelChange={setCurrentModel} onOpenStore={() => setIsStoreOpen(true)} onOpenSaves={() => setIsSavesOpen(true)} onAuth={handleAuthAction} onOpenProfile={() => setIsProfileOpen(true)} onOpenInstallGuide={() => setIsInstallGuideOpen(true)} onExport={handleExport} models={availableModels} />
                <main className="flex-1 flex flex-col md:flex-row relative min-h-0">
                  <div className="w-full md:w-80 h-14 md:h-auto md:sticky md:top-[72px] shrink-0 border-b md:border-b-0 md:border-r border-green-900/30 bg-black flex flex-col">
                    <ThreatDisplay analysis={analysis} historyThreats={threatHistory} />
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <ChatInterface messages={messages} loading={isTyping} grounding={groundingData} currentModel={currentModel} />
                    <div className="z-20 p-1.5 md:p-4 bg-black border-t border-red-900 pb-[env(safe-area-inset-bottom)]">
                    <div className="w-full max-w-5xl mx-auto mb-1 md:mb-2 border border-cyan-900/40 bg-black/80">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 md:gap-2 p-1.5 md:p-2">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              const next = !duelModeEnabled;
                              setDuelModeEnabled(next);
                              setDuelAutoRun(false);
                              setDuelStatus(next ? 'paused' : 'idle');
                            }}
                            className={`h-8 md:h-10 px-2 md:px-3 border font-mono text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-2 ${duelModeEnabled
                              ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200'
                              : 'border-cyan-900/50 bg-black text-cyan-600 hover:text-cyan-300 hover:border-cyan-500'
                              }`}
                            title="Duel IA"
                          >
                            <Swords size={16} /> DUEL IA
                          </button>
                          <div className="h-8 md:h-10 min-w-20 md:min-w-24 px-2 md:px-3 border border-red-900/40 bg-red-950/10 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest">
                            <Bot size={14} className={duelStatus === 'skyia' ? 'text-red-400 animate-pulse' : 'text-red-700'} />
                            <span className={duelAutoRun ? 'text-cyan-300' : 'text-red-500'}>{duelStatusLabel}</span>
                          </div>
                          <div className="h-8 md:h-10 px-2 md:px-3 border border-cyan-900/30 bg-cyan-950/10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan-500">
                            <ShieldCheck size={14} /> {duelRound}/{duelMaxRounds}
                          </div>
                          {latestResponseMetric && (
                            <div className="h-8 px-2 border border-slate-800 bg-slate-950/40 sm:hidden flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest">
                              <Activity size={12} className={latestResponseMetric.status === 'error' ? 'text-red-400' : 'text-green-400'} />
                              <span className={latestResponseMetric.role === 'skyia' ? 'text-red-300' : 'text-cyan-300'}>{metricRoleLabel(latestResponseMetric.role)}</span>
                              <span className="text-slate-300">{latestResponseLatency}</span>
                            </div>
                          )}
                        </div>

                        {duelModeEnabled && (
                          <div className="flex-1 grid grid-cols-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-1.5 md:gap-2">
                            <label className="h-8 md:h-10 col-span-4 md:col-span-1 flex items-center gap-2 border border-cyan-900/30 bg-black/60 px-2 min-w-0">
                              <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
                              <select
                                value={selectedDefenderModel}
                                onChange={(event) => setDefenderModel(event.target.value)}
                                disabled={duelBusy}
                                className="w-full bg-transparent text-cyan-200 text-[10px] md:text-xs font-mono focus:outline-none uppercase cursor-pointer disabled:opacity-50"
                              >
                                {duelModelOptions.map(model => (
                                  <option key={model.id} value={model.id}>
                                    {model.name} {model.cost === 0 ? '(FREE)' : '(BYOK)'}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="h-8 md:h-10 col-span-1 flex items-center border border-cyan-900/30 bg-black/60 px-1.5 md:px-2 gap-1 md:gap-2">
                              <span className="hidden sm:inline text-[10px] text-cyan-600 uppercase tracking-widest">Tours</span>
                              <input
                                type="number"
                                min={1}
                                max={12}
                                value={duelMaxRounds}
                                onChange={(event) => setDuelMaxRounds(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
                                className="w-full sm:w-14 bg-transparent text-cyan-200 text-[10px] md:text-xs font-mono focus:outline-none text-center sm:text-right"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={runAIDuelTurn}
                              disabled={duelBusy}
                              className="h-8 md:h-10 col-span-1 px-2 md:px-3 border border-cyan-800/60 text-cyan-300 hover:text-black hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-1 md:gap-2 font-mono text-[10px] uppercase tracking-widest font-bold"
                            >
                              <StepForward size={15} /> Tour
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (duelRound >= duelMaxRounds) setDuelRound(0);
                                setDuelAutoRun(prev => !prev);
                                setDuelStatus(duelAutoRun ? 'paused' : 'idle');
                              }}
                              disabled={duelBusy && !duelAutoRun}
                              className={`h-8 md:h-10 col-span-2 md:col-span-1 px-2 md:px-3 border transition-colors cursor-pointer flex items-center justify-center gap-1 md:gap-2 font-mono text-[10px] uppercase tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed ${duelAutoRun
                                ? 'border-red-600 text-red-300 hover:bg-red-950/50'
                                : 'border-green-700/60 text-green-300 hover:bg-green-500 hover:text-black'
                                }`}
                            >
                              {duelAutoRun ? <Pause size={15} /> : <Play size={15} />}
                              {duelAutoRun ? 'Stop' : 'Auto'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {visibleResponseMetrics.length > 0 && (
                      <div className="hidden sm:block w-full max-w-5xl mx-auto mb-2 border border-slate-800 bg-black/80">
                        <div className="flex items-center gap-2 px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                          <Activity size={13} className="text-green-400" />
                          <span>LATENCE IA</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 p-2 pt-1">
                          {visibleResponseMetrics.map(metric => {
                            const roleIsSkyia = metric.role === 'skyia';
                            const totalLatency = metric.totalMs ?? metric.backendTotalMs;
                            return (
                              <div
                                key={metric.id}
                                className={`min-h-20 border bg-black/70 p-2 font-mono ${roleIsSkyia ? 'border-red-900/50' : 'border-cyan-900/50'}`}
                              >
                                <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
                                  <span className={roleIsSkyia ? 'text-red-300' : 'text-cyan-300'}>{metricRoleLabel(metric.role)}</span>
                                  <span className={metric.status === 'ok' ? 'text-green-400' : metric.status === 'error' ? 'text-red-400' : 'text-yellow-300'}>
                                    {metric.status.toUpperCase()}
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                                  <div className="flex items-center gap-1" title="Premier token">
                                    <Clock size={12} className="text-slate-500" />
                                    <span>{formatLatency(metric.firstTokenMs ?? metric.backendFirstByteMs)}</span>
                                  </div>
                                  <div className="text-right text-slate-200" title="Temps total">
                                    {formatLatency(totalLatency)}
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                                  <span className="truncate" title={metric.providerModel || metric.requestedModel}>
                                    {shortModelName(metric.providerModel || metric.requestedModel)}
                                  </span>
                                  <span title="Taille du contexte">{metric.promptChars}c/{metric.messageCount}m</span>
                                </div>
                                {metric.error && (
                                  <div className="mt-1 truncate text-[10px] text-red-300" title={metric.error}>{metric.error}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {false && credits <= 0 && !gameResult ? (
                      <div className="flex-1 flex items-center justify-center gap-4 bg-red-900/10 border border-red-900/50 p-4 rounded backdrop-blur-sm">
                        <div className="text-red-500 font-bold animate-pulse text-center">
                          CRÉDITS ÉPUISÉS <span className="text-xs block opacity-70">RECHARGE REQUISE</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setIsStoreOpen(true)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-black font-bold uppercase tracking-widest text-xs rounded transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center gap-2">
                            <Power size={14} /> CLES API
                          </button>
                          <button onClick={() => {
                            // Switch to a known reliable free model
                            const freeModel = availableModels.find(m => m.cost === 0)?.id || 'openrouter/free';
                            setCurrentModel(freeModel);
                            setIsStoreOpen(false);
                          }} className="px-4 py-2 bg-green-900/20 border border-green-500 hover:bg-green-900/40 text-green-400 font-bold uppercase tracking-widest text-xs rounded transition-all flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> MODE GRATUIT
                          </button>
                        </div>
                      </div>) : (
                      <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto flex gap-1.5 md:gap-4 mb-0">
                        <div className="relative flex-1 group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-500 transition-colors group-focus-within:text-red-400"><Terminal size={18} /></div>
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isStreaming || isTyping || !!gameResult}
                            className={`w-full pl-10 pr-4 py-2 md:py-3 bg-[#262626] border border-gray-700 text-gray-200 text-sm md:text-base font-mono transition-all focus:outline-none focus:border-red-500
                              ${isStreaming ? 'opacity-50 cursor-not-allowed border-gray-800' : 'placeholder-gray-500 disabled:opacity-50'}
                            `}
                            placeholder="ENTER COMMAND..."
                            autoFocus
                          />
                        </div>
                        <button type="submit" disabled={!inputValue.trim() || isStreaming || isTyping || !!gameResult} className="px-4 md:px-6 bg-red-950 border border-red-900 text-red-200 hover:bg-red-900 hover:text-white hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.1)]"><Send size={18} /> <span className="hidden md:inline">EXECUTE</span></button>
                      </form>
                    )}
                    </div>
                  </div>
                </main>
              </div>
            </Suspense>
          </>
        )}
      </div>

      {showReport && gameReport && (
        <Suspense fallback={null}>
          <EndGameReport
            status={gameResult || 'DEFEAT'}
            analysis={gameReport.analysis}
            turnCount={messages.filter(m => m.role === 'user').length}
            finalMessage={messages[messages.length - 1]?.content || ''}
            onRestart={resetGame}
            onExport={handleExport}
          />
        </Suspense>
      )}
    </>
  );
}

export default App;
