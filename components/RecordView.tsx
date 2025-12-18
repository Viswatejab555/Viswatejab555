
import React, { useEffect, useState, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { saveMemory, getStorageUsage } from '../services/storageService';
import { analyzeForReminder, analyzeFile } from '../services/geminiService';
import { scheduleReminder } from '../services/notificationService';
import { uploadMemoriesToDrive } from '../services/driveService';

interface RecordViewProps {
  onSaved: () => void;
}

const RecordView: React.FC<RecordViewProps> = ({ onSaved }) => {
  const { 
    isListening, 
    transcript, 
    interimTranscript, 
    startListening, 
    stopListening,
    resetTranscript,
    hasSupport 
  } = useSpeechRecognition();

  const [feedback, setFeedback] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setFeedback('');
      startListening();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Your New AI Friend',
      text: 'Check out Your New AI Friend, an intelligent assistant that remembers everything for you!',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setFeedback('Link copied to clipboard!');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const processMemory = async (text: string) => {
    setIsAnalyzing(true);
    
    try {
        // 1. Save locally
        const savedMemory = saveMemory(text);
        
        // Check storage limit
        const storage = getStorageUsage();
        if (storage.isFull) {
             setFeedback('Warning: Storage almost full!');
        }

        // 1.5 Background Sync
        uploadMemoriesToDrive().catch(err => console.warn("Background sync failed:", err));

        // 2. Check for reminder
        const reminderData = await analyzeForReminder(text);
        
        if (reminderData.isReminder && reminderData.timestamp && reminderData.label) {
           scheduleReminder({
             id: crypto.randomUUID(),
             memoryId: savedMemory.id,
             label: reminderData.label,
             timestamp: reminderData.timestamp,
             completed: false
           });
           const timeString = new Date(reminderData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
           setFeedback(`Reminder set for ${timeString}!`);
        } else {
           if (!storage.isFull) setFeedback('Memory saved!');
        }
      } catch (e) {
        if (e instanceof Error && e.message === "Storage Full") {
             setFeedback('ERROR: Storage Full. Please clear space.');
        } else {
             setFeedback('Memory saved (Analysis failed)');
        }
      }

      resetTranscript();
      setIsAnalyzing(false);
      
      setTimeout(() => {
        setFeedback('');
        onSaved(); 
      }, 2500);
  };

  const handleSave = async () => {
    const textToSave = (transcript + ' ' + interimTranscript).trim();
    if (textToSave.length > 0) {
      stopListening();
      setFeedback('Saving & Analyzing...');
      await processMemory(textToSave);
    } else {
        setFeedback('Say something first!');
        setTimeout(() => setFeedback(''), 1500);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    setFeedback('Analyzing file...');
    setIsAnalyzing(true);

    try {
        const description = await analyzeFile(file);
        const memoryText = `[File Upload - ${file.name}]: ${description}`;
        await processMemory(memoryText);
    } catch (error) {
        console.error(error);
        setFeedback('Failed to analyze file.');
        setIsAnalyzing(false);
        setTimeout(() => setFeedback(''), 2000);
    }
  };

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, interimTranscript]);

  if (!hasSupport) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-400">
        <p>Your browser does not support speech recognition.</p>
        <p className="text-sm mt-2">Please try Chrome on Android or Desktop.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={handleShare}
          className="p-2 rounded-full bg-zinc-900/50 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700"
          aria-label="Share App"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full">
        <div className={`relative mb-8 transition-all duration-300 ${isListening ? 'scale-110' : 'scale-100'}`}>
          {isListening && (
            <>
              <div className="absolute inset-0 bg-emerald-500 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute -inset-4 bg-emerald-500 rounded-full opacity-10 animate-pulse"></div>
            </>
          )}
          
          <div className="relative">
             <button
                onClick={handleToggle}
                disabled={isAnalyzing}
                className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl border-4 transition-colors duration-300 relative z-10
                ${isListening 
                    ? 'bg-red-500 border-red-400 text-white' 
                    : isAnalyzing 
                        ? 'bg-zinc-700 border-zinc-600 text-zinc-500'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-500'}
                `}
            >
                {isAnalyzing ? (
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
                </svg>
                ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                )}
            </button>
            
            {/* Upload Button (only visible when not listening/analyzing) */}
            {!isListening && !isAnalyzing && (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-zinc-300 border border-zinc-600 hover:bg-zinc-600 hover:text-white transition-all shadow-lg z-20"
                    title="Upload Doc/Image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </button>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
          </div>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <h2 className="text-2xl font-light text-white tracking-wide text-center">
            {isAnalyzing ? 'Thinking...' : isListening ? 'Tap to Stop' : 'Tap to Record'}
          </h2>
          
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 backdrop-blur-sm max-h-[30vh] overflow-y-auto custom-scrollbar p-4 flex flex-col min-h-[100px]">
             <p className="text-lg text-zinc-300 leading-relaxed font-light break-words">
               {transcript}
               <span className="text-zinc-500 italic">{interimTranscript ? ' ' + interimTranscript : ''}</span>
               {(!transcript && !interimTranscript) && <span className="text-zinc-600 italic">Say something or upload a file (Image, PDF, DOCX) to remember...</span>}
             </p>
             <div ref={transcriptEndRef} />
          </div>

          {feedback && <p className={`text-sm font-medium animate-bounce text-center ${feedback.includes('Error') || feedback.includes('Full') || feedback.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>{feedback}</p>}
        </div>
      </div>

      {(transcript || interimTranscript) && !isListening && !isAnalyzing && (
        <div className="p-6 pb-24 w-full flex gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button 
             onClick={resetTranscript}
             className="flex-1 py-4 rounded-xl bg-zinc-800 text-zinc-400 font-medium active:scale-95 transition-transform"
          >
            Clear
          </button>
          <button 
             onClick={handleSave}
             className="flex-[2] py-4 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform"
          >
            Save Memory
          </button>
        </div>
      )}
      
       {(transcript || interimTranscript) && isListening && (
        <div className="p-6 pb-24 w-full flex gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button 
             onClick={handleSave}
             className="w-full py-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            Stop & Save
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordView;
