import { useState, useEffect, useRef, useCallback } from 'react';

// Augmented Window interface for SpeechRecognition
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Refs to maintain state inside event handlers without dependencies
  const recognitionRef = useRef<any>(null);
  const isIntentionalListening = useRef(false);

  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        // Engine started
      };

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setTranscript(prev => prev + ' ' + final);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        // "no-speech" is common when user pauses. We ignore it to keep listening (via onend restart).
        if (event.error === 'no-speech') {
            return; 
        }
        
        console.error("Speech recognition error", event.error);
        
        // For fatal errors, we must stop.
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            isIntentionalListening.current = false;
            setIsListening(false);
        }
      };

      recognition.onend = () => {
        // If we intend to be listening, restart immediately.
        if (isIntentionalListening.current) {
            try {
                recognition.start();
            } catch (e) {
                console.warn("Failed to restart speech recognition", e);
                isIntentionalListening.current = false;
                setIsListening(false);
            }
        } else {
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    // Cleanup function to stop recognition when the component unmounts
    return () => {
      if (recognitionRef.current) {
        // Important: clear the onend handler so it doesn't try to restart
        recognitionRef.current.onend = null; 
        recognitionRef.current.abort(); // abort() stops immediately
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isIntentionalListening.current) {
      try {
          isIntentionalListening.current = true;
          setIsListening(true);
          recognitionRef.current.start();
      } catch(e) {
          console.error("Already started or error starting", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isIntentionalListening.current) {
      isIntentionalListening.current = false;
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    hasSupport: !!((window as unknown as IWindow).webkitSpeechRecognition || (window as unknown as IWindow).SpeechRecognition)
  };
};