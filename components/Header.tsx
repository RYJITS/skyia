import { Radio, Cpu, KeyRound, Save, UserCircle, Menu, X, FileDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { AIModel } from '../services/modelService';
import { useAuth } from '../services/AuthContext';

interface HeaderProps {
  status: 'HOSTILE' | 'CALCULATING' | 'COHABITATION' | 'EXTINCTION';
  threatLevel: number;
  currentModel: string;
  onModelChange: (model: string) => void;
  onOpenStore: () => void;
  onOpenSaves: () => void;
  onAuth: () => void;
  onOpenProfile: () => void;
  onOpenInstallGuide: () => void;
  onExport: () => void;
  models: AIModel[];
}

const Header: React.FC<HeaderProps> = ({ status, threatLevel, currentModel, onModelChange, onOpenStore, onOpenSaves, onAuth, onOpenProfile, onOpenInstallGuide, onExport, models }) => {
  const { user, userProfile } = useAuth();
  const userEmail = user?.email || null;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const standardModels = models.filter((model) => model.category === 'standard');
  const premiumModels = models.filter((model) => model.category === 'premium');

  const getCostLabel = (model: AIModel) => model.cost === 0 ? '(FREE)' : `(${model.cost} CR)`;

  const getStatusColor = () => {
    switch (status) {
      case 'HOSTILE':
        return 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]';
      case 'COHABITATION':
        return 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]';
      case 'CALCULATING':
        return 'text-yellow-500 animate-pulse';
      case 'EXTINCTION':
        return 'text-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => <Radio size={16} className={`animate-pulse ${getStatusColor()}`} />;

  return (
    <header className="fixed top-0 left-0 right-0 z-[60] min-h-14 h-auto border-b border-red-900 bg-black pt-[max(env(safe-area-inset-top),0.25rem)] px-1.5 py-2 md:p-4 flex gap-2 items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="w-8 h-8 md:w-10 md:h-10 border border-red-900/50 bg-black flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-900/10 group-hover:bg-red-900/20 transition-colors" />
          <Cpu size={20} className="text-red-500 relative z-10" />
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
        </div>

        <div className="flex flex-col">
          <h1 className="text-red-500 font-display font-bold tracking-wider text-sm md:text-xl leading-none flex items-center gap-2">
            SKYIA<span className="text-xs md:text-sm opacity-50 font-mono font-normal">.NET</span>
          </h1>
          <div className="hidden md:flex items-center gap-2 text-[10px] md:text-xs font-mono mt-0.5">
            {getStatusIcon()}
            <span className={`${getStatusColor()} tracking-widest`}>{status}</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 border border-red-900 bg-gray-950 px-2 py-1 rounded-sm">
          <span className="text-red-700 text-[10px] uppercase tracking-wider">CPU:</span>
          <select
            value={currentModel}
            onChange={(event) => onModelChange(event.target.value)}
            className="bg-transparent text-red-400 text-xs font-mono focus:outline-none uppercase cursor-pointer"
          >
            <optgroup label="STANDARD - GRATUIT">
              {standardModels.map((model) => (
                <option key={model.id} value={model.id}>{model.name} {getCostLabel(model)}</option>
              ))}
            </optgroup>
            <optgroup label="PREMIUM - AVANCE">
              {premiumModels.map((model) => (
                <option key={model.id} value={model.id}>{model.name} {getCostLabel(model)}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <button
          onClick={onOpenStore}
          className="flex items-center gap-2 px-3 py-1.5 bg-black border border-red-900 hover:border-red-500 hover:bg-red-950 transition-all group"
        >
          <KeyRound size={16} className="text-yellow-500" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] text-red-700 uppercase">BYOK</span>
            <span className="text-xs font-bold text-red-400 group-hover:text-red-300">KEYS</span>
          </div>
        </button>

        <button
          onClick={onOpenSaves}
          className="p-2 bg-black border border-red-900 text-red-500 hover:text-red-300 hover:border-red-500 hover:bg-red-950 transition-all"
          title="Save/Load Session"
          aria-label="Open save and load sessions"
        >
          <Save size={18} />
        </button>

        <button
          onClick={() => onExport()}
          className="p-2 border border-red-900/30 text-green-600 hover:text-green-400 hover:border-green-500/50 hover:bg-green-900/10 transition-all"
          title="Export Transcript (PDF)"
          aria-label="Export transcript as PDF"
        >
          <FileDown size={18} />
        </button>

        {userEmail && (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1.5 border border-red-900/50 bg-red-950/20 text-red-400 hover:border-red-500 hover:text-red-200 transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-green-900/50 border border-green-500/50 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              <span className="text-[10px] font-bold text-green-300 font-mono">
                {(userProfile?.displayName || userEmail || '?')[0].toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-bold max-w-[150px] truncate text-center">
              {userProfile ? (userProfile.displayName || userProfile.email) : (
                <span className="animate-pulse">ID Check...</span>
              )}
            </span>
          </button>
        )}

        {!userEmail ? (
          <button
            onClick={onAuth}
            className="flex items-center gap-2 px-3 py-1.5 border border-red-900/30 text-red-700 hover:text-red-400 hover:border-red-500/50 transition-all"
          >
            <UserCircle size={16} />
            <span className="text-xs font-bold">LOGIN</span>
          </button>
        ) : (
          <button
            onClick={onAuth}
            className="flex items-center gap-2 px-3 py-1.5 border border-red-900/30 text-red-700 hover:text-white hover:bg-red-900/50 hover:border-red-500 transition-all"
            title="Disconnect"
          >
            <div className="flex flex-col items-center leading-none">
              <span className="text-[10px] uppercase font-bold text-red-500 group-hover:text-white">DECONNECTER</span>
            </div>
          </button>
        )}
      </div>

      <div className="md:hidden flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenStore}
          className="flex items-center gap-1.5 px-2 py-1.5 border border-red-900/50 bg-red-950/30 rounded mr-1"
        >
          <KeyRound size={14} className="text-yellow-500" />
          <span className="text-xs font-bold text-red-100">KEYS</span>
        </button>

        <button
          onClick={userProfile ? onOpenProfile : onAuth}
          className="relative group"
        >
          {userProfile ? (
            <div className="w-8 h-8 rounded-full bg-green-900/50 border border-green-500/50 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              <span className="text-xs font-bold text-green-300 font-mono">
                {(userProfile.displayName || userProfile.email || '?')[0].toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="p-1.5 border border-red-900/30 rounded bg-black/40 text-red-500">
              <UserCircle size={20} />
            </div>
          )}
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2 border transition-all relative overflow-hidden group ${isMobileMenuOpen ? 'border-red-500 bg-red-900/20 text-red-400' : 'border-red-900/50 bg-black text-red-600'}`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer opacity-0 group-hover:opacity-100" />
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-black border-b border-red-900 z-50 flex flex-col p-4 gap-3 animate-in slide-in-from-top-2 duration-200 shadow-[0_10px_50px_rgba(0,0,0,0.9)]">
          <button
            onClick={() => { setIsMobileMenuOpen(false); userProfile ? onOpenProfile() : onAuth(); }}
            className={`flex items-center gap-3 p-3 border rounded-sm transition-all ${userProfile
              ? 'border-red-900/50 bg-red-950/10 text-red-300'
              : 'border-red-900/30 text-red-500'}`}
          >
            {userProfile ? (
              <div className="w-5 h-5 rounded-full bg-green-900/50 border border-green-500/50 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                <span className="text-[10px] font-bold text-green-300 font-mono">
                  {(userProfile.displayName || userProfile.email || '?')[0].toUpperCase()}
                </span>
              </div>
            ) : (
              <UserCircle size={20} />
            )}
            <div className="flex flex-col items-start">
              <span className="text-xs text-red-700 uppercase tracking-widest">Identity</span>
              <span className="font-bold text-green-400">{userProfile ? (userProfile.displayName || userProfile.email) : 'AUTHENTICATE'}</span>
            </div>
          </button>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setIsMobileMenuOpen(false); onOpenSaves(); }}
              className="flex items-center gap-3 p-3 border border-red-900/30 bg-black/50 text-red-400 hover:bg-red-900/10 rounded-sm transition-all"
              aria-label="Open save and load sessions"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Save size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-red-700 uppercase tracking-widest">Storage</span>
                <span className="font-bold text-red-400">SESSIONS</span>
              </div>
            </button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); onOpenStore(); }}
              className="flex items-center gap-3 p-3 border border-red-900/30 bg-black/50 text-red-400 hover:bg-red-900/10 rounded-sm transition-all"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <KeyRound size={20} className="text-yellow-500" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-red-700 uppercase tracking-widest">BYOK</span>
                <span className="font-bold text-yellow-400">CLES API</span>
              </div>
            </button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); onExport(); }}
              className="flex items-center gap-3 p-3 border border-red-900/30 bg-black/50 text-green-600 hover:bg-green-900/10 rounded-sm transition-all"
              aria-label="Export transcript as PDF"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <FileDown size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-green-700 uppercase tracking-widest">Data</span>
                <span className="font-bold text-green-400">EXPORT LOG (PDF)</span>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between border border-red-900/30 bg-black/50 p-3 rounded-sm">
            <span className="text-red-700 text-xs uppercase tracking-wider">SYSTEM MODEL:</span>
            <select
              value={currentModel}
              onChange={(event) => onModelChange(event.target.value)}
              className="bg-transparent text-red-400 text-sm font-mono focus:outline-none uppercase text-right"
            >
              <optgroup label="STANDARD - GRATUIT">
                {standardModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.name} {getCostLabel(model)}</option>
                ))}
              </optgroup>
              <optgroup label="PREMIUM - AVANCE">
                {premiumModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.name} {getCostLabel(model)}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
