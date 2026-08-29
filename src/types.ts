export type ReflectionMode = 
  | 'deep_reflection'
  | 'brainstorming'
  | 'gratitude'
  | 'problem_solving'
  | 'freeform';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface ReflectionSummary {
  summary: string;
  keyTakeaways: string[];
  coreThemes: string[];
  moodTone: string;
  actionablePrompts: string[];
  generatedAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mode: ReflectionMode;
  tags: string[];
  isFavorite?: boolean;
  messages: ChatMessage[];
  summary?: ReflectionSummary | null;
  mood?: string;
  sentimentScore?: number; // 1 to 10
  themes?: string[]; // array of up to 3 strings
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ReflectResponse {
  reply: string;
  reflection: string;
  mood: string;
  sentimentScore: number;
  themes: string[];
  modelUsed: string;
  timestamp: string;
}

