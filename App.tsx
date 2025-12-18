import React, { useState, useEffect } from 'react';
import RecordView from './components/RecordView';
import ChatView from './components/ChatView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import StatusBar from './components/StatusBar';
import { AppScreen } from './types';
import { requestNotificationPermission, loadAndSchedulePendingReminders } from './services/notificationService';
import { getStoredApiKey } from './services/geminiService';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.RECORD);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Request permission on mount and load any pending reminders from storage
    requestNotificationPermission();
    loadAndSchedulePendingReminders();

    // Check for API key on first load
    if (!getStoredApiKey()) {
        setCurrentScreen(AppScreen.SETTINGS);
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="w-full h-screen bg-black flex justify-center items-center">
      {/* Mobile Frame Container */}
      <div className="w-full h-full sm:h-[800px] sm:w-[400px] sm:rounded-[3rem] sm:border-[8px] sm:border-zinc-800 overflow-hidden bg-zinc-950 relative flex flex-col shadow-2xl">
        
        {/* Android-like Status Bar */}
        <StatusBar />
        
        {/* PWA Install Button - Shows only if browser allows installation */}
        {deferredPrompt && (
          <div className="absolute top-14 left-0 right-0 z-50 flex justify-center pointer-events-none">
             <button
               onClick={handleInstallClick}
               className="pointer-events-auto bg-emerald-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg border border-emerald-400/30 flex items-center gap-2 text-sm font-medium hover:bg-emerald-400 transition-colors animate-in slide-in-from-top-4 fade-in duration-500"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
               Install App
             </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {currentScreen === AppScreen.RECORD && <RecordView onSaved={() => setCurrentScreen(AppScreen.HISTORY)} />}
          {currentScreen === AppScreen.ASK && <ChatView />}
          {currentScreen === AppScreen.HISTORY && <HistoryView />}
          {currentScreen === AppScreen.SETTINGS && <SettingsView />}
        </div>

        {/* Bottom Navigation */}
        <div className="bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800/50 absolute bottom-0 w-full pb-safe">
          <div className="flex justify-between px-6 items-center h-16">
            <button 
              onClick={() => setCurrentScreen(AppScreen.HISTORY)}
              className={`flex flex-col items-center gap-1 w-12 transition-colors ${currentScreen === AppScreen.HISTORY ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-medium">History</span>
            </button>

            <button 
              onClick={() => setCurrentScreen(AppScreen.RECORD)}
              className="relative -top-6"
            >
               <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95
                 ${currentScreen === AppScreen.RECORD ? 'bg-emerald-500 text-white shadow-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}
               `}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-5v-2.07z" clipRule="evenodd" />
                 </svg>
               </div>
            </button>

            <button 
              onClick={() => setCurrentScreen(AppScreen.ASK)}
              className={`flex flex-col items-center gap-1 w-12 transition-colors ${currentScreen === AppScreen.ASK ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="text-[10px] font-medium">Ask AI</span>
            </button>
            
            <button 
              onClick={() => setCurrentScreen(AppScreen.SETTINGS)}
              className={`flex flex-col items-center gap-1 w-12 transition-colors ${currentScreen === AppScreen.SETTINGS ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-medium">Config</span>
            </button>
          </div>
          {/* Home Indicator line for iOS-like feel on web */}
          <div className="h-1 w-32 bg-zinc-800 rounded-full mx-auto mb-2"></div>
        </div>
      </div>
    </div>
  );
};

export default App;