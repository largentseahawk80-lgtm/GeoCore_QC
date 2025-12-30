export const listen = (onResult: (text: string) => void, onStatus?: (listening: boolean) => void) => {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - Vendor prefixes
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser. Try using Chrome, Edge, or Safari.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  if (onStatus) onStatus(true);

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    // Remove trailing periods often added by dictation
    const cleanText = transcript.replace(/\.$/, '');
    onResult(cleanText);
  };

  recognition.onend = () => {
    if (onStatus) onStatus(false);
  };

  recognition.onerror = (event: any) => {
    console.warn("Speech recognition error", event.error);
    if (onStatus) onStatus(false);
  };

  try {
    recognition.start();
  } catch (e) {
    console.error("Failed to start recognition", e);
    if (onStatus) onStatus(false);
  }
};