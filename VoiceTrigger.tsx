
import React, { useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { listen } from '../services/voiceService';

interface VoiceTriggerProps {
  onTranscript: (text: string) => void;
  uppercase?: boolean;
  className?: string;
}

const VoiceTrigger: React.FC<VoiceTriggerProps> = ({ onTranscript, uppercase = true, className = "" }) => {
  const [listening, setListening] = useState(false);

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    // Haptic feedback for "Start Listening"
    if (navigator.vibrate) navigator.vibrate(50);
    
    listen(
      (text) => {
        // Haptic feedback for "Success"
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        onTranscript(uppercase ? text.toUpperCase() : text);
      },
      (state) => setListening(state)
    );
  };

  return (
    <button
      type="button"
      onClick={handleStart}
      className={`p-1.5 rounded-full transition-all duration-200 ${
        listening 
          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200 scale-110 shadow-lg' 
          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
      } ${className}`}
      title={listening ? "Listening..." : "Tap to speak"}
    >
      {listening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
    </button>
  );
};

export default VoiceTrigger;
