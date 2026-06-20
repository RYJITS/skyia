import React, { useEffect, useId, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2, Save, Trash2, X } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { deleteUserApiKey, getUserApiKeys, saveUserApiKey } from '../services/userKeysService';
import { UserApiKey } from '../types';

interface UserKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const providerLabel = (provider: string) => provider === 'groq' ? 'Groq' : 'OpenRouter';

const UserKeysModal: React.FC<UserKeysModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const titleId = useId();
  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [provider, setProvider] = useState<'openrouter' | 'groq'>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadKeys = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setKeys(await getUserApiKeys());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible de charger les cles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setApiKey('');
      loadKeys();
    }
  }, [isOpen, user?.uid]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      await saveUserApiKey(provider, apiKey.trim());
      setApiKey('');
      await loadKeys();
      setMessage('Cle enregistree.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Echec enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (target: 'openrouter' | 'groq') => {
    setLoading(true);
    setMessage('');
    try {
      await deleteUserApiKey(target);
      await loadKeys();
      setMessage('Cle supprimee.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Echec suppression.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg bg-black border border-yellow-900/60 shadow-[0_0_50px_rgba(234,179,8,0.12)]"
      >
        <div className="flex justify-between items-center p-4 border-b border-yellow-900/40 bg-yellow-950/10">
          <h2 id={titleId} className="text-yellow-400 font-display tracking-widest flex items-center gap-2">
            <KeyRound size={18} /> CLES MODELES PAYANTS
          </h2>
          <button onClick={onClose} aria-label="Fermer la fenetre des cles API" className="text-gray-500 hover:text-yellow-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!user ? (
            <div className="p-4 border border-red-900/50 bg-red-900/10 text-red-300 text-sm flex gap-3">
              <AlertTriangle size={18} className="shrink-0" />
              Connectez-vous pour enregistrer vos cles API personnelles.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-3">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'openrouter' | 'groq')}
                  className="bg-black border border-yellow-900/60 text-yellow-300 px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq</option>
                </select>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="COLLER LA CLE API PERSONNELLE..."
                  className="bg-black border border-yellow-900/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={loading || !apiKey.trim()}
                className="w-full py-3 border border-yellow-600 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-800/40 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest font-bold text-xs"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Enregistrer la cle
              </button>

              <div className="border-t border-gray-800 pt-4 space-y-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Cles actives</div>
                {keys.length === 0 && <div className="text-sm text-gray-600">Aucune cle personnelle enregistree.</div>}
                {keys.map(key => {
                  const last4 = key.keyLast4 || key.key_last4 || '????';
                  return (
                    <div key={key.provider} className="flex items-center justify-between border border-gray-800 bg-gray-950/60 p-3">
                      <div>
                        <div className="text-sm text-white font-bold">{providerLabel(key.provider)}</div>
                        <div className="text-[10px] text-gray-500">****{last4}</div>
                      </div>
                      <button
                        onClick={() => handleDelete(key.provider)}
                        disabled={loading}
                        className="p-2 text-red-500 hover:text-red-300 border border-red-900/40 hover:border-red-500"
                        title="Supprimer"
                        aria-label={`Supprimer la cle ${providerLabel(key.provider)}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {message && <div className="text-xs text-yellow-300 border border-yellow-900/40 bg-yellow-950/10 p-2">{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default UserKeysModal;
