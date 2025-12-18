
import React, { useState, useEffect } from 'react';
import { getStoredApiKey, setStoredApiKey, getStoredPersona, setStoredPersona, PERSONAS } from '../services/geminiService';
import { getStoredClientId, setStoredClientId, initDrive, connectAndSync, uploadMemoriesToDrive, downloadMemoriesFromDrive } from '../services/driveService';
import { getStorageUsage, clearMemories } from '../services/storageService';

const SettingsView: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [persona, setPersona] = useState('default');
  const [saved, setSaved] = useState(false);
  const [driveStatus, setDriveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [storage, setStorage] = useState({ formatted: '0.00 MB', percent: 0, isFull: false });

  useEffect(() => {
    const k = getStoredApiKey();
    if (k) setApiKey(k);

    const p = getStoredPersona();
    if (p) setPersona(p);

    const c = getStoredClientId();
    if (c) {
        setClientId(c);
        if (window.google && window.gapi) {
             initDrive(c).catch(console.error);
        }
    }

    setStorage(getStorageUsage());
  }, []);

  const handleSaveMain = () => {
    setStoredApiKey(apiKey);
    setStoredPersona(persona);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnectDrive = async () => {
      setDriveStatus('loading');
      setStatusMsg('Connecting...');
      try {
          setStoredClientId(clientId);
          await initDrive(clientId);
          await connectAndSync();
          setDriveStatus('success');
          setStatusMsg('Connected!');
      } catch (e) {
          setDriveStatus('error');
          setStatusMsg('Connection failed');
      }
  };

  const handleSyncUp = async () => {
      setDriveStatus('loading');
      setStatusMsg('Uploading...');
      try {
          await uploadMemoriesToDrive();
          setDriveStatus('success');
          setStatusMsg('Backup Complete!');
          setStorage(getStorageUsage());
      } catch (e) {
          setDriveStatus('error');
          setStatusMsg('Upload Failed');
          console.error(e);
      }
  };

  const handleSyncDown = async () => {
      if(!window.confirm("This will overwrite your local memories with the backup from Drive. Continue?")) return;
      
      setDriveStatus('loading');
      setStatusMsg('Downloading...');
      try {
          await downloadMemoriesFromDrive();
          setDriveStatus('success');
          setStatusMsg('Restored from Drive!');
          setStorage(getStorageUsage());
      } catch (e) {
          setDriveStatus('error');
          setStatusMsg('Download Failed (File not found?)');
          console.error(e);
      }
  };
  
  const handleClearLocal = () => {
    if(window.confirm("Are you sure? This will delete all memories from this device. Make sure you have backed up to Drive first.")) {
      clearMemories();
      setStorage(getStorageUsage());
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="px-6 pt-6 pb-4 bg-zinc-950 sticky top-0 z-10 border-b border-zinc-900">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
      </div>
      
      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-24">
        
        {/* API Key Section */}
        <div className="space-y-4">
            <h2 className="text-zinc-300 text-lg font-medium">Gemini API Key</h2>
            <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste Gemini API Key..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:border-emerald-500 focus:outline-none"
            />
        </div>

        {/* Persona Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-900">
            <h2 className="text-zinc-300 text-lg font-medium">AI Personality</h2>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(PERSONAS).map(([id, p]) => (
                <button
                  key={id}
                  onClick={() => setPersona(id)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    persona === id 
                      ? 'bg-emerald-500/10 border-emerald-500' 
                      : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${persona === id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {p.label}
                    </span>
                    {persona === id && (
                       <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button 
                onClick={handleSaveMain}
                className={`w-full py-3 rounded-xl font-bold transition-all mt-2 ${saved ? 'bg-emerald-600 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
                {saved ? 'Saved!' : 'Save General Settings'}
            </button>
        </div>

        {/* Storage Stats Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-900">
            <div className="flex justify-between items-end">
                <h2 className="text-zinc-300 text-lg font-medium">Local Storage</h2>
                <span className={`text-xs font-mono ${storage.isFull ? 'text-red-500 font-bold' : 'text-zinc-500'}`}>
                    {storage.formatted} / 5.00 MB
                </span>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${storage.isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${storage.percent}%` }}
                ></div>
            </div>

            {storage.isFull && (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-200 text-sm flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>
                        Your storage is nearly full! Please <b>Upload</b> your memories to Drive to back them up, then use <b>Clear Local</b> to free up space.
                    </p>
                </div>
            )}
        </div>

        {/* Google Drive Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-900">
            <h2 className="text-blue-400 text-lg font-medium flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.43 12.98l.05-.18-6.43-11.08C12.78 1.25 12.4 1 12 1c-.4 0-.78.25-1.05.72L5.87 10.3l6.56 11.36c.16-.01 2.37-4.11 7-8.68zM5.09 11.66L1.6 17.69c-.28.48-.28 1.08 0 1.56.28.49.78.75 1.33.75h18.23c-3.13-4.59-5.18-8.22-5.18-8.22l-4.7-8.15-6.19 10.73V11.66zM11.97 12l-6.17 10.69L11.5 22.8c.4 0 .78-.25 1.05-.72l5.77-10.02L11.97 12z"/>
                </svg>
                Backup & Sync
            </h2>
            
            <input 
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Google Cloud Client ID..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:border-blue-500 focus:outline-none"
            />

            <div className="flex gap-2">
                 <button 
                    onClick={handleConnectDrive}
                    disabled={!clientId}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-zinc-800 text-white rounded-xl font-medium"
                >
                    Connect
                </button>
            </div>

            {/* Sync Controls */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                    onClick={handleSyncUp}
                    disabled={driveStatus === 'loading'}
                    className={`p-3 border rounded-xl text-sm flex flex-col items-center gap-1 transition-colors
                        ${storage.isFull ? 'bg-emerald-900/30 border-emerald-500/50 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                >
                    <span className="font-bold">↑ Manual Save</span>
                    <span className="text-[10px] opacity-70">To Google Drive</span>
                </button>
                <button 
                    onClick={handleSyncDown}
                    disabled={driveStatus === 'loading'}
                    className="p-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm flex flex-col items-center gap-1"
                >
                    <span className="font-bold">↓ Restore</span>
                    <span className="text-[10px] opacity-70">From Google Drive</span>
                </button>
            </div>
            
            <button 
                onClick={handleClearLocal}
                className="w-full p-3 mt-2 bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 rounded-xl text-red-400 text-sm font-medium"
            >
                Clear Local Storage
            </button>

            {statusMsg && (
                <p className={`text-center text-sm ${driveStatus === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                    {statusMsg}
                </p>
            )}
        </div>

        <div className="pt-8 text-center">
             <p className="text-zinc-700 text-xs">
                Your New AI Friend v1.2.0
            </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
