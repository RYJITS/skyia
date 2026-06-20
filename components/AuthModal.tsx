import React, { useEffect, useId, useState } from 'react';
import { X, Shield, Lock, Mail, LogIn, AlertTriangle, Fingerprint } from 'lucide-react';
import { useAuth } from '../services/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { user, login, register, logout, loading: authLoading } = useAuth();
    const titleId = useId();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError('');
            setEmail(user?.email || '');
            setPassword('');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLocalLoading(true);

        try {
            if (user) {
                await logout();
                onClose();
                return;
            }

            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Echec de l'authentification");
        } finally {
            setLocalLoading(false);
        }
    };

    const isLoading = localLoading || authLoading;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 font-mono">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-sm bg-black border border-blue-900/50 shadow-[0_0_50px_rgba(0,0,255,0.05)] relative overflow-hidden flex flex-col"
            >
                <div className="flex justify-between items-center p-4 border-b border-blue-900/30 bg-black/50">
                    <h2 id={titleId} className="text-blue-500 font-display tracking-widest flex items-center gap-2">
                        <Shield size={18} />
                        {user ? "COMPTE CONNECTE" : "VERIFICATION D'IDENTITE"}
                    </h2>
                    <button onClick={onClose} aria-label="Fermer la fenetre d'authentification" className="text-gray-500 hover:text-blue-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-2 bg-red-900/20 border border-red-500 text-red-500 text-xs flex items-center gap-2">
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] text-blue-400 uppercase tracking-widest">ID neuronal (email)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                readOnly={!!user}
                                className={`w-full bg-black/50 border border-gray-700 text-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none ${user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="operative@humanity.net"
                            />
                        </div>
                    </div>

                    {!user && (
                        <div className="space-y-1">
                            <label className="text-[10px] text-blue-400 uppercase tracking-widest">Code d'acces</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={isLogin ? undefined : 8}
                                    className="w-full bg-black/50 border border-gray-700 text-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="********"
                                />
                            </div>
                            {!isLogin && <div className="text-[10px] text-gray-600">Minimum 8 caracteres.</div>}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 transition-colors uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-2 mt-4
                            ${user
                                ? 'bg-red-900/30 hover:bg-red-800/50 border border-red-600 text-red-400 hover:text-white'
                                : 'bg-blue-900/30 hover:bg-blue-800/50 border border-blue-600 text-blue-400 hover:text-white'}`}
                    >
                        {isLoading ? 'TRAITEMENT...' : (
                            user ? <span className="flex items-center gap-2"><LogIn size={16} className="rotate-180" /> SE DECONNECTER</span> :
                                isLogin ? <span className="flex items-center gap-2"><LogIn size={16} /> SE CONNECTER</span> :
                                    <span className="flex items-center gap-2"><Fingerprint size={16} /> CREER LE COMPTE</span>
                        )}
                    </button>

                    {!user && (
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                className="text-xs text-gray-500 hover:text-white underline decoration-dotted"
                            >
                                {isLogin ? "Aucun identifiant ? Initialiser l'inscription" : "Deja enregistre ? Se connecter"}
                            </button>
                        </div>
                    )}
                </form>

                <div className="p-3 bg-black/80 text-[10px] text-gray-600 text-center border-t border-gray-800">
                    STOCKAGE SECURISE // SESSION CHIFFREE
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
