
import { Memory } from '../types';

const MEMORY_KEY = 'remindme_ai_memories';

export const saveMemory = (content: string): Memory => {
  const newMemory: Memory = {
    id: crypto.randomUUID(),
    content: content.trim(),
    timestamp: Date.now(),
  };

  const existing = getMemories();
  const updated = [newMemory, ...existing];
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Storage quota exceeded", e);
    throw new Error("Storage Full");
  }
  return newMemory;
};

export const getMemories = (): Memory[] => {
  try {
    const data = localStorage.getItem(MEMORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse memories", e);
    return [];
  }
};

export const importMemories = (memories: Memory[]): void => {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
};

export const deleteMemory = (id: string): Memory[] => {
  const existing = getMemories();
  const updated = existing.filter(m => m.id !== id);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(updated));
  return updated;
};

export const clearMemories = (): void => {
  localStorage.removeItem(MEMORY_KEY);
};

export const getStorageUsage = () => {
  const data = localStorage.getItem(MEMORY_KEY) || '';
  // Accurate byte calculation
  const size = new Blob([data]).size;
  // 5MB is the safe cross-browser limit for localStorage
  const limit = 5 * 1024 * 1024; 
  
  return {
    usedBytes: size,
    formatted: (size / (1024 * 1024)).toFixed(2) + ' MB',
    percent: Math.min((size / limit) * 100, 100),
    isFull: size > (limit * 0.9) // Warning threshold at 90%
  };
};
