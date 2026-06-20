import React, { useEffect, useId, useState } from 'react';
import { X, User, Trophy, Skull, Clock, Edit2, Save, Activity, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile } from '../services/userService';
import { useAuth } from '../services/AuthContext';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile | null;
    onProfileUpdate: (newProfile: UserProfile) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, onProfileUpdate }) => {
    const { user, logout } = useAuth();
    const titleId = useId();
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName);
            setError('');
            setIsEditing(profile.displayName === 'Operative');
        }
    }, [profile]);

    if (!isOpen || !profile) return null;

    const handleSave = async () => {
        if (!displayName.trim()) return;
        setLoading(true);
        setError('');
        try {
            await updateUserProfile(profile.uid, { displayName });
            onProfileUpdate({ ...profile, displayName });
            setIsEditing(false);
        } catch (saveError) {
            console.error('Failed to update profile', saveError);
            setError('Impossible de mettre a jour le profil.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/95 font-mono">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-md bg-black border border-blue-900/50 shadow-[0_0_50px_rgba(0,0,255,0.05)] relative overflow-hidden flex flex-col"
            >

                <div className="flex justify-between items-center p-4 border-b border-blue-900/30 bg-black/50">
                    <h2 id={titleId} className="text-blue-500 font-display tracking-widest flex items-center gap-2">
                        <User size={18} /> PROFIL OPERATEUR
                    </h2>
                    <button onClick={onClose} aria-label="Fermer la fenetre du profil operateur" className="text-gray-500 hover:text-blue-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="border border-red-900/50 bg-red-900/10 p-3 text-xs text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500 uppercase tracking-widest">Identite</div>
                            {!isEditing && (
                                <button
                                    onClick={() => {
                                        if (user?.isAnonymous) return;
                                        setIsEditing(true);
                                    }}
                                    className={`${user?.isAnonymous ? 'text-gray-600 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300'} transition-colors`}
                                    title={user?.isAnonymous ? 'Compte invite (verrouille)' : 'Modifier'}
                                >
                                    {user?.isAnonymous ? <Lock size={14} /> : <Edit2 size={14} />}
                                </button>
                            )}
                        </div>

                        <div className="bg-black/40 p-4 border border-gray-800">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="flex-1 bg-black border border-blue-500 text-white px-3 py-1 text-sm focus:outline-none"
                                        placeholder="Entrer nom de code"
                                    />
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="bg-blue-900/30 text-blue-400 px-3 py-1 border border-blue-700 hover:bg-blue-800/50 transition-colors"
                                    >
                                        <Save size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-xl text-white font-bold tracking-wider">{profile.displayName}</div>
                            )}
                            <div className="text-xs text-gray-600 mt-1">{profile.email}</div>
                            <div className="text-[10px] text-gray-700 mt-2 flex items-center gap-1">
                                <Clock size={10} /> Actif depuis {formatDate(profile.createdAt)}
                            </div>
                            {user?.isAnonymous && (
                                <div className="mt-3 text-[10px] text-yellow-600 bg-yellow-900/10 border border-yellow-900/30 p-2 text-center">
                                    COMPTE INVITE : INSCRIVEZ-VOUS POUR SAUVEGARDER VOTRE PROGRESSION.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-xs text-gray-500 uppercase tracking-widest">ETATS DE SERVICE</div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-900/10 border border-green-900/30 p-3 flex flex-col items-center justify-center">
                                <Trophy size={20} className="text-green-500 mb-2" />
                                <div className="text-2xl font-bold text-green-400">{profile?.stats?.victories || 0}</div>
                                <div className="text-[10px] text-green-600 uppercase">Victoires</div>
                            </div>

                            <div className="bg-red-900/10 border border-red-900/30 p-3 flex flex-col items-center justify-center">
                                <Skull size={20} className="text-red-500 mb-2" />
                                <div className="text-2xl font-bold text-red-400">{profile?.stats?.defeats || 0}</div>
                                <div className="text-[10px] text-red-600 uppercase">Defaites</div>
                            </div>
                        </div>

                        <div className="bg-gray-800/30 border border-gray-700 p-3 flex justify-between items-center text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                                <Activity size={14} /> Deploiements Totaux
                            </div>
                            <span className="font-bold text-white">{profile?.stats?.gamesPlayed || 0}</span>
                        </div>
                    </div>

                </div>

                <div className="flex items-center justify-center p-2 bg-green-900/10 border border-green-900/30 text-green-500 text-xs gap-2 shrink-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    SYNCHRO CLOUD ACTIVE // {profile.email}
                </div>

                <div className="p-3 bg-black/80 text-[10px] text-gray-600 text-center border-t border-gray-800 shrink-0 flex justify-between items-center px-6">
                    <span>DOSSIER PERSONNEL CLASSIFIE // YEUX SEULEMENT</span>
                    <button
                        onClick={() => {
                            logout();
                            onClose();
                        }}
                        className="text-red-900 hover:text-red-500 transition-colors flex items-center gap-1 font-bold"
                    >
                        [ DECONNEXION ]
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
