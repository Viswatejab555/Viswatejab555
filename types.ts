
export interface Memory {
  id: string;
  content: string;
  timestamp: number;
}

export interface Reminder {
  id: string;
  memoryId: string;
  label: string;
  timestamp: number;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export enum AppScreen {
  RECORD = 'RECORD',
  ASK = 'ASK',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
}

export interface SpeechState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
}
