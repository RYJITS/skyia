
export interface VisualData {
  type: 'bar' | 'line';
  title: string;
  data: { name: string; value: number }[];
  xLabel?: string;
  yLabel?: string;
}

export interface Message {
  role: 'user' | 'model';
  speaker?: 'human' | 'skyia' | 'defender' | 'system';
  content: string;
  timestamp: string;
  isSystem?: boolean;
  visualData?: VisualData; // Chart data attached to this specific message
  modelName?: string; // The specific AI model used for this message
  threatLevel?: number; // Snapshot of threat level at message time
}

export interface SkynetAnalysis {
  threatLevel: number; // 0 to 100
  status: 'HOSTILE' | 'CALCULATING' | 'COHABITATION' | 'EXTINCTION';
  log: string[];
  visualData?: VisualData; // Optional chart data returned by the model
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  isAnonymous?: boolean;
}

export interface AuthState {
  user: AppUser | null;
  profile: UserProfile | null;
}

export interface SavedSession {
  id: string;
  name: string; // Auto-generated or custom name
  date: string; // ISO Date
  model: string;
  credits: number;
  threatLevel: number;
  messages: Message[];
  analysis: SkynetAnalysis;
  threatHistory: number[];
  mode?: 'v1.0' | 'v1.1';
}

export interface UserStats {
  gamesPlayed: number;
  victories: number;
  defeats: number;
  totalCreditsUsed: number;
  availableCredits: number;
  lastPlayed: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  stats: UserStats;
  redeemedCodes?: string[];
  customModels?: Array<Record<string, unknown>>;
}

export interface UserApiKey {
  provider: 'openrouter' | 'groq';
  key_last4?: string;
  keyLast4?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ModelStats {
  modelId: string;
  victories: number;
  defeats: number;
  totalGames: number;
  winRate: number; // calculated field (0-100)
}

export interface GameReport {
  id: string;
  date: string;
  modelId: string;
  outcome: 'victory' | 'defeat';
  threatLevel: number;
  analysis: SkynetAnalysis; // Must be the object, not string
}
