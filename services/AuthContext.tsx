import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppUser, UserProfile } from '../types';
import { apiGet, apiPost } from './apiClient';

interface AuthContextType {
    user: AppUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshProfile: () => Promise<void>;
    authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        refreshProfile().finally(() => setLoading(false));
    }, []);

    const login = async (email: string, pass: string) => {
        const result = await apiPost<{ user: AppUser; profile: UserProfile }>('/auth/login', { email, password: pass });
        setUser(result.user);
        setUserProfile(result.profile);
        setAuthError(null);
    };

    const register = async (email: string, pass: string) => {
        const result = await apiPost<{ user: AppUser; profile: UserProfile }>('/auth/register', { email, password: pass });
        setUser(result.user);
        setUserProfile(result.profile);
        setAuthError(null);
    };

    const logout = async () => {
        await apiPost('/auth/logout');
        setUser(null);
        setUserProfile(null);
    };

    const resetPassword = async (email: string) => {
        throw new Error("Password reset is not available yet.");
    };

    const refreshProfile = async () => {
        try {
            const result = await apiGet<{ user: AppUser | null; profile: UserProfile | null }>('/auth/me');
            setUser(result.user);
            setUserProfile(result.profile);
            setAuthError(null);
            return result.profile;
        } catch (error: any) {
            setUser(null);
            setUserProfile(null);
            setAuthError(error.message || null);
            return null;
        }
    };

    // Derived State
    const isAdmin = userProfile?.email === 'admin@skyia.net' || false;

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            isAdmin,
            authError,
            login,
            register,
            logout,
            resetPassword,
            refreshProfile
        }}>
            {loading ? (
                <div className="h-screen w-full bg-black text-green-500 flex flex-col items-center justify-center font-mono">
                    <div className="animate-spin mb-4">
                        <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <div className="text-sm tracking-widest animate-pulse">
                        INITIALISATION DU PROTOCOLE...
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
