import React, { useEffect, useState } from 'react';
import { Memory } from '../types';
import { getMemories, deleteMemory } from '../services/storageService';

const HistoryView: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    setMemories(getMemories());
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm("Forget this memory?")) {
        setMemories(deleteMemory(id));
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="px-6 pt-6 pb-4 bg-zinc-950 sticky top-0 z-10 border-b border-zinc-900">
        <h1 className="text-2xl font-bold text-white tracking-tight">Memory Bank</h1>
        <p className="text-zinc-500 text-sm mt-1">{memories.length} items stored</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {memories.length === 0 ? (
          <div className="text-center text-zinc-600 mt-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No memories yet.</p>
          </div>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 shadow-sm relative group">
               <p className="text-zinc-200 text-base leading-relaxed">{memory.content}</p>
               <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-800/50">
                  <span className="text-xs text-zinc-500 font-mono">
                    {new Date(memory.timestamp).toLocaleDateString()} • {new Date(memory.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <button 
                    onClick={() => handleDelete(memory.id)}
                    className="text-zinc-600 hover:text-red-400 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;