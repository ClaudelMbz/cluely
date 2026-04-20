/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Copy, Trash2, Settings, History, Info, Play, Circle, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface TranscriptItem {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

// --- Component ---

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en-US' | 'fr-FR'>('en-US');
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRecordingRef = useRef(false);

  // Initialize Speech Recognition once
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscripts(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          text: finalTranscript,
          timestamp: Date.now(),
          isFinal: true
        }]);
      }
      setCurrentText(interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition status:', event.error);
      
      // 'aborted' and 'no-speech' are common and often non-fatal for our UX
      if (event.error === 'not-allowed') {
        setError("Microphone access denied. Please allow microphone permissions.");
        setIsRecording(false);
        isRecordingRef.current = false;
      } else if (event.error === 'aborted' || event.error === 'no-speech') {
        // Silently skip these and let onend handle restarting if we're still "on"
      } else {
        setError(`System Error: ${event.error}`);
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    recognition.onend = () => {
      // If we are supposed to be recording but it ended (e.g. silence or timeout)
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // If already started, this will error - we can ignore
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update language when state changes
  useEffect(() => {
    if (recognitionRef.current) {
      const wasRecording = isRecordingRef.current;
      
      if (wasRecording) {
        recognitionRef.current.stop();
      }
      
      setCurrentText('');
      recognitionRef.current.lang = language;
      
      if (wasRecording) {
        setTimeout(() => {
          if (isRecordingRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        }, 150);
      }
    }
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, currentText]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current?.stop();
    } else {
      setError(null);
      isRecordingRef.current = true;
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Manual start failed", e);
      }
    }
  }, [isRecording]);

  const clearTranscripts = () => {
    setTranscripts([]);
    setCurrentText('');
  };

  const copyToClipboard = () => {
    const fullText = transcripts.map(t => t.text).join(' ') + (currentText ? ' ' + currentText : '');
    navigator.clipboard.writeText(fullText);
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] flex items-center justify-center p-4 font-sans selection:bg-[#FF4444] selection:text-white">
      <div className="w-full max-w-2xl bg-[#151619] rounded-2xl shadow-2xl overflow-hidden border border-[#2a2b2f] flex flex-col h-[80vh]">
        
        {/* Hardware Header */}
        <div className="bg-[#1c1d21] p-4 border-b border-[#2a2b2f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#3d3f46] shadow-inner" />
            <h1 className="font-mono text-[10px] tracking-[0.2em] text-[#8E9299] uppercase font-bold">
              EchoVoice v1.0 / Signal Processor
            </h1>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[#5a5d63] uppercase">Language</span>
              <div className="flex gap-1 mt-0.5">
                <button 
                  onClick={() => setLanguage('en-US')}
                  className={`font-mono text-[9px] px-1.5 py-0.5 rounded transition-all ${language === 'en-US' ? 'bg-[#FF4444] text-white' : 'text-[#8E9299] hover:text-white bg-[#2a2b2f]'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('fr-FR')}
                  className={`font-mono text-[9px] px-1.5 py-0.5 rounded transition-all ${language === 'fr-FR' ? 'bg-[#FF4444] text-white' : 'text-[#8E9299] hover:text-white bg-[#2a2b2f]'}`}
                >
                  FR
                </button>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-[#2a2b2f]" />
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[#5a5d63] uppercase">Status</span>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-[#FF4444] animate-pulse shadow-[0_0_8px_#FF4444]' : 'bg-[#3d3f46]'}`} />
                <span className="font-mono text-[10px] text-[#8E9299] uppercase tracking-tighter">
                  {isRecording ? 'Recording' : 'Standby'}
                </span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-[#2a2b2f]" />
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[#5a5d63] uppercase">Memory</span>
              <span className="font-mono text-[10px] text-[#8E9299] uppercase">
                {transcripts.length} Pkts
              </span>
            </div>
          </div>
        </div>

        {/* Display Screen */}
        <div className="flex-1 relative bg-[#0d0e11] overflow-hidden group">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          <div 
            ref={scrollRef}
            className="absolute inset-0 p-8 overflow-y-auto scrollbar-hide flex flex-col gap-4"
          >
            {transcripts.length === 0 && !currentText && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <Mic className="w-12 h-12 mb-4 text-[#8E9299]" />
                <p className="font-mono text-xs tracking-widest text-[#8E9299] uppercase">Ready to Capture Signal</p>
                <p className="mt-2 text-[10px] font-mono text-[#5a5d63]">Initiate sequence via main control</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {transcripts.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 border-l-2 border-[#2a2b2f] bg-[#1a1b1e]/50 rounded-r-md"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[9px] text-[#5a5d63] tracking-tighter">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#d1d5db] font-serif italic text-lg leading-relaxed">
                    {t.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {currentText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 border-l-2 border-[#FF4444] bg-[#FF4444]/5 rounded-r-md"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[9px] text-[#FF4444] tracking-tighter uppercase animate-pulse">
                    Capturing...
                  </span>
                </div>
                <p className="text-[#8E9299] font-serif italic text-lg leading-relaxed">
                  {currentText}
                </p>
              </motion.div>
            )}
          </div>

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
        </div>

        {/* Error Bar */}
        {error && (
          <div className="bg-[#FF4444]/20 border-y border-[#FF4444]/40 px-4 py-2 flex items-center gap-2">
            <Info className="w-3 h-3 text-[#FF4444]" />
            <span className="font-mono text-[10px] text-[#FF4444] uppercase tracking-tighter">{error}</span>
          </div>
        )}

        {/* Control Desk */}
        <div className="bg-[#1c1d21] p-6 border-t border-[#2a2b2f] flex flex-col gap-6">
          
          {/* Waveform Visualization (Mock) */}
          <div className="h-8 flex items-center justify-center gap-1">
            {Array.from({ length: 48 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: isRecording ? [4, Math.random() * 24 + 4, 4] : 4,
                  backgroundColor: isRecording ? '#FF4444' : '#3d3f46'
                }}
                transition={{
                  duration: 0.5 + Math.random() * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-1 rounded-full opacity-60"
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button 
                onClick={clearTranscripts}
                className="w-10 h-10 rounded-full border border-[#2a2b2f] bg-[#151619] text-[#8E9299] hover:text-[#fff] hover:bg-[#2a2b2f] transition-all flex items-center justify-center group"
                title="Clear All"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={copyToClipboard}
                className="w-10 h-10 rounded-full border border-[#2a2b2f] bg-[#151619] text-[#8E9299] hover:text-[#fff] hover:bg-[#2a2b2f] transition-all flex items-center justify-center group"
                title="Copy Transcript"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {/* Main Trigger */}
            <button 
              onClick={toggleRecording}
              className={`
                relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                ${isRecording 
                  ? 'bg-[#FF4444] shadow-[0_0_30px_rgba(255,68,68,0.4)] scale-110' 
                  : 'bg-[#1c1d21] border-2 border-[#2a2b2f] hover:border-[#8E9299] hover:scale-105'
                }
              `}
            >
              <div className={`absolute inset-1 rounded-full border border-white/10`} />
              {isRecording ? (
                <Square className="w-6 h-6 text-white" fill="currentColor" />
              ) : (
                <Mic className="w-6 h-6 text-[#8E9299]" />
              )}
            </button>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full border border-[#2a2b2f] bg-[#151619] text-[#5a5d63] flex items-center justify-center cursor-not-allowed">
                <Settings className="w-4 h-4" />
              </div>
              <div className="w-10 h-10 rounded-full border border-[#2a2b2f] bg-[#151619] text-[#5a5d63] flex items-center justify-center cursor-not-allowed">
                <History className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <span className="font-mono text-[8px] text-[#5a5d63] uppercase tracking-[0.4em]">
              Precision Audio Interface // Model-X
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
