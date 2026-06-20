import React, { useEffect, useId, useState } from 'react';
import { X, Save, HardDrive, Trash2, PlayCircle, AlertTriangle, Edit, Check } from 'lucide-react';
import { Message, SavedSession, SkynetAnalysis, UserProfile } from '../types';
import { getSavedSessions, deleteSession, saveSession, renameSession } from '../services/storageService';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionData?: {
    id: string | null;
    messages: Message[];
    analysis: SkynetAnalysis;
    credits: number;
    model: string;
    threatHistory: number[];
    mode: 'v1.0' | 'v1.1';
  };
  onLoad: (session: SavedSession) => void;
  onSaveComplete: (newId: string) => void;
  userProfile: UserProfile | null;
}

const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  currentSessionData,
  onLoad,
  onSaveComplete,
  userProfile
}) => {
  const titleId = useId();
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Custom Name State
  const [saveName, setSaveName] = useState('');

  // Renaming State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Set default name on open
  useEffect(() => {
    if (isOpen && currentSessionData) {
      const now = new Date();
      // Only set default if we don't have a name yet (or could use current session ID logic)
      // For new saves, suggest a default. For overwrites, maybe keep it empty or use existing name if we knew it?
      // But currentSessionData doesn't convey the "name" of the session if it was loaded.
      // We'll stick to a generic default format user can edit.
      if (!currentSessionData.id) {
        setSaveName(`SIM_${now.toLocaleDateString().replace(/\//g, '')}_${now.toLocaleTimeString().replace(/:/g, '')}`);
      } else {
        // If overwriting, try to find existing name from sessions list if possible?
        // For now, leave empty to imply "keep existing" or "auto-generate" unless user types? 
        // Actually user wants to name it. Let's start blank or with a placeholder.
        setSaveName('');
      }
    }
  }, [isOpen, currentSessionData]);

  useEffect(() => {
    if (isOpen) {
      const fetchSessions = async () => {
        try {
          const data = await getSavedSessions();
          setSessions(data);
        } catch (fetchError) {
          const message = fetchError instanceof Error ? fetchError.message : 'LOAD FAILED';
          setSessions([]);
          setError(message);
        }
      };
      fetchSessions();
      setError(null);
    }
  }, [isOpen, userProfile]); // Re-fetch when user profile changes

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!currentSessionData) return;

    // Use custom name if provided, otherwise undefined (service handles default)
    const finalName = saveName.trim() || undefined;

    const result = await saveSession(
      currentSessionData.id,
      currentSessionData.messages,
      currentSessionData.analysis,
      currentSessionData.credits,
      currentSessionData.model,
      currentSessionData.threatHistory,
      currentSessionData.mode,
      finalName // Pass custom name
    );

    if (result.success) {
      const updatedSessions = await getSavedSessions();
      setSessions(updatedSessions);
      onSaveComplete(result.id);
    } else {
      setError(result.error || 'SAVE FAILED');
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const updated = await renameSession(id, renameValue.trim());
    setSessions(updated);
    setRenamingId(null);
  };

  const startRenaming = (session: SavedSession) => {
    setRenamingId(session.id);
    setRenameValue(session.name);
  };

  const handleDelete = async (id: string) => {
    const updated = await deleteSession(id);
    setSessions(updated);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg bg-black border border-green-900/50 shadow-[0_0_50px_rgba(0,255,0,0.05)] relative overflow-hidden flex flex-col max-h-[90dvh] md:max-h-[80vh]"
      >

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-green-900/30 bg-black/50">
          <h2 id={titleId} className="text-green-500 font-display tracking-widest flex items-center gap-2">
            <HardDrive size={18} /> MEMORY BANKS
          </h2>
          <button onClick={onClose} aria-label="Fermer la fenetre de sauvegarde" className="text-gray-500 hover:text-green-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Connection Status Bar */}
        <div className={`text-[10px] uppercase font-bold text-center py-1 tracking-widest ${userProfile ? 'bg-green-900/20 text-green-500 border-b border-green-900/30' : 'bg-gray-800 text-gray-400 border-b border-gray-700'}`}>
          {userProfile ? 'CONNECTED TO MYSQL STORAGE' : 'GUEST MODE (LOCAL STORAGE)'}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">

          {error && (
            <div className="mb-4 p-2 bg-red-900/20 border border-red-500 text-red-500 text-xs flex items-center gap-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Current Session Save Block */}
          {currentSessionData && (
            <div className="mb-8 border-b border-gray-800 pb-6">
              <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Active Simulation</div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="NAME OF MEMORY (OPTIONAL)"
                  className="w-full bg-black/40 border border-green-900/30 text-green-400 p-2 text-xs font-mono focus:border-green-500 outline-none uppercase"
                />
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 bg-green-900/20 hover:bg-green-900/40 border border-green-700 text-green-400 py-3 transition-colors uppercase tracking-widest text-sm font-bold"
                >
                  <Save size={16} />
                  {currentSessionData.id ? 'OVERWRITE CURRENT SLOT' : 'CREATE NEW SAVE'}
                </button>
              </div>

              <div className="text-[10px] text-gray-600 text-center mt-2">
                {userProfile ? `${sessions.length}/5 MYSQL SLOTS USED` : `${sessions.length}/5 LOCAL SLOTS USED`}
              </div>
            </div>
          )}

          {/* List of Saves */}
          <div className="space-y-3">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Archived Simulations</div>

            {sessions.length === 0 && (
              <div className="text-center py-8 text-gray-600 italic text-xs">
                {userProfile ? 'NO DATA FOUND IN MYSQL STORAGE' : 'NO DATA FOUND IN LOCAL MEMORY'}
              </div>
            )}

            {sessions.map((session) => (
              <div key={session.id} className="border border-gray-700 bg-black/40 p-3 hover:border-green-800 transition-colors group relative">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    {renamingId === session.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="bg-black border border-green-500 text-green-400 text-xs p-1 w-32 focus:outline-none uppercase"
                          autoFocus
                        />
                        <button onClick={() => handleRename(session.id)} aria-label={`Confirmer le renommage de ${session.name}`} className="text-green-500 hover:text-green-300"><Check size={14} /></button>
                        <button onClick={() => setRenamingId(null)} aria-label={`Annuler le renommage de ${session.name}`} className="text-red-500 hover:text-red-300"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-green-400 font-bold text-sm">{session.name}</div>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500">{new Date(session.date).toLocaleString()}</div>
                  </div>
                  <div className={`text-xs font-bold ${session.threatLevel > 80 ? 'text-red-500' : 'text-green-500'}`}>
                    THREAT: {session.threatLevel}%
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-600 font-mono mb-3">
                  <span>CREDITS: {session.credits}</span>
                  <span>MODEL: {session.model}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { onLoad(session); onClose(); }}
                    className="flex-1 bg-gray-800 hover:bg-green-900/30 text-gray-300 hover:text-green-400 py-1 flex items-center justify-center gap-1 transition-colors border border-gray-700"
                  >
                    <PlayCircle size={12} /> LOAD
                  </button>
                  <button
                    onClick={() => startRenaming(session)}
                    className="bg-gray-800 hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-400 px-3 py-1 transition-colors border border-gray-700"
                    title="Rename"
                    aria-label={`Renommer ${session.name}`}
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 px-3 py-1 transition-colors border border-gray-700"
                    title="Delete"
                    aria-label={`Supprimer ${session.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div >
  );
};

export default SaveLoadModal;
