import React, { useState } from 'react';
import { Mic, Sparkles, Loader2, StopCircle } from 'lucide-react';
import { listen } from './services/voiceService';import { parseVoiceLog } from './services/geminiService';
interface MagicMicProps {
  logType: string;
  onDataParsed: (data: any) => void;
  className?: string;
}
const MagicMic: React.FC<MagicMicProps> = ({ logType, onDataParsed, className = "" }) => {
  const [listening, setListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (listening) {
       // Stop manually handled by voiceService, but we can prevent double clicks
       return;
    }

    setTranscript('');
    
    // Listen
    listen(
      async (text) => {
        // On Result (Final)
        setListening(false);
        setTranscript(text);
        
        if (!text) return;

        setAnalyzing(true);
        try {
            const parsed = await parseVoiceLog(text, logType);
            onDataParsed(parsed);
        } catch (err) {
            console.error(err);
            alert("Could not analyze voice input.");
        } finally {
            setAnalyzing(false);
        }
      },
      (state) => setListening(state)
    );
  };
return (
    <div className={`fixed bottom-24 right-6 z-50 ${className}`}>
        {transcript && analyzing && (
            <div className="absolute bottom-full mb-4 right-0 bg-slate-900 text-white p-3 rounded-lg text-xs w-64 shadow-xl mb-2 animate-fade-in">
                <p className="font-bold opacity-50 uppercase mb-1">Heard:</p>
                "{transcript}"
            </div>
        )}
        
        <button
            type="button"
            onClick={handleStart}
            disabled={analyzing}
            className={`flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 transform
                ${listening 
                    ? 'w-20 h-20 bg-red-500 hover:bg-red-600 scale-110 ring-4 ring-red-200 animate-pulse' 
                    : analyzing 
                        ? 'w-16 h-16 bg-indigo-600 cursor-wait'
                        : 'w-16 h-16 bg-blue-600 hover:bg-blue-700 hover:scale-105'
                }
            `}
        >
            {listening ? (
                <Mic className="w-8 h-8 text-white" />
            ) : analyzing ? (
                <Sparkles className="w-8 h-8 text-white animate-spin" />
            ) : (
                <Mic className="w-8 h-8 text-white" />
            )}
        </button>
        {listening && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-full">
                Listening...
            </div>
        )}
        {!listening && !analyzing && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-slate-400 text-[10px] font-bold uppercase">
                Magic Mic
            </div>
        )}
    </div>
  );
};

export default MagicMic;
