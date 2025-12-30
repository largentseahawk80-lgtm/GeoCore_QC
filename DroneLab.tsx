
import React, { useState, useRef } from 'react';
import { DroneMedia, GeoLocation } from '../types';
import { compressImage, extractGPSFromImage } from '../services/imageService';
import { isDemoMode, formatCoords } from '../services/geoService';
import { UploadCloud, MapPin, Loader2, Plus, ArrowRight, Trash2, Wrench, Layers } from 'lucide-react';

const DroneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M12 12l4.5 -4.5" />
    <path d="M12 12l-4.5 -4.5" />
    <path d="M12 12l4.5 4.5" />
    <path d="M12 12l-4.5 4.5" />
    <path d="M6 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M18 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  </svg>
);

interface DroneLabProps {
  media: DroneMedia[];
  onImport: (newMedia: DroneMedia[]) => void;
  onDelete: (id: string) => void;
  onCreateLog: (type: 'repair' | 'panel', media: DroneMedia) => void;
}

const DroneLab: React.FC<DroneLabProps> = ({ media, onImport, onDelete, onCreateLog }) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessing(true);
    setProgress(0);
    const total = files.length;

    try {
        // Process sequentially to keep memory usage low and prevent UI blocking.
        // We import images incrementally to update the UI as we go.
        for (let i = 0; i < total; i++) {
            const file = files[i];
            setCurrentFile(file.name);
            
            // 1. Update progress indicator
            const percent = Math.round(((i) / total) * 100);
            setProgress(percent);
            
            // 2. Yield to main thread to let UI update and GC run.
            // Critical: This prevents the "Freezing" sensation on mobile devices.
            await new Promise(r => setTimeout(r, 100)); 
            
            try {
                // 3. Compress Image (Memory safe)
                // Use a smaller dimension (1200px) for the field interface to prevent OOM
                // compared to the default 2500px, which causes freezing with multiple files.
                const compressed = await compressImage(file, 1200, 0.85);
                
                // 4. Extract GPS
                const gps = await extractGPSFromImage(file, isDemoMode());

                const newItem: DroneMedia = {
                    id: crypto.randomUUID(),
                    fileName: file.name,
                    thumbnail: compressed,
                    locationGeo: gps,
                    timestamp: file.lastModified
                };

                // 5. Import immediately (Incremental update)
                onImport([newItem]);

            } catch (err) {
                console.error(`Failed to process ${file.name}`, err);
                // We continue to the next file even if one fails
            }
        }
        setProgress(100);
    } catch (err) {
        console.error("Batch processing error", err);
        alert("Error processing drone images.");
    } finally {
        setProcessing(false);
        setProgress(0);
        setCurrentFile('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header / Upload Zone */}
      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <DroneIcon className="w-48 h-48" />
         </div>
         
         <div className="relative z-0">
             <div className="flex items-center gap-3 mb-4">
                 <div className="bg-sky-500 p-2 rounded-lg">
                     <DroneIcon className="w-8 h-8 text-white" />
                 </div>
                 <div>
                     <h2 className="text-3xl font-black uppercase tracking-wider">Drone Lab</h2>
                     <p className="text-sky-300 font-mono text-sm">DJI MINI 5 PRO INTEGRATION</p>
                 </div>
             </div>

             <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="flex-1">
                     <p className="text-slate-300 mb-6 max-w-lg leading-relaxed">
                         Import high-res aerial imagery. The system will automatically compress files for speed, extract GPS telemetry, and allow you to orchestrate repairs directly from the flight map.
                     </p>
                     
                     <div className="space-y-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={processing}
                            className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg shadow-sky-900/50"
                        >
                            {processing ? <Loader2 className="w-6 h-6 animate-spin"/> : <UploadCloud className="w-6 h-6" />}
                            {processing ? `Importing... ${progress}%` : 'Import Flight Media'}
                        </button>
                        
                        {processing && (
                            <div className="w-full max-w-sm">
                                <div className="flex justify-between text-xs text-sky-400 mb-1">
                                    <span>Processing: {currentFile}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-sky-500 h-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                     </div>

                     <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                     />
                 </div>

                 {/* Stats */}
                 <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 min-w-[200px]">
                     <div className="text-sky-400 text-xs font-bold uppercase mb-1">Active Flights</div>
                     <div className="text-4xl font-bold">{media.length}</div>
                     <div className="text-slate-500 text-xs mt-1">Images Processed</div>
                 </div>
             </div>
         </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {media.length === 0 && !processing && (
             <div className="col-span-full text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
                 <DroneIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                 <p className="font-bold">No Drone Data Found</p>
                 <p className="text-sm">Upload photos from your SD card to begin.</p>
             </div>
         )}

         {media.map(item => (
             <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                 <div className="relative h-48 bg-slate-100">
                     <img src={item.thumbnail} alt="Drone" className="w-full h-full object-cover" />
                     
                     <button 
                        onClick={() => onDelete(item.id)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                         <Trash2 className="w-4 h-4" />
                     </button>

                     <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1">
                         <MapPin className="w-3 h-3 text-sky-400" />
                         {item.locationGeo ? formatCoords(item.locationGeo) : 'NO GPS DATA'}
                     </div>
                 </div>

                 <div className="p-4">
                     <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between">
                         <span className="truncate max-w-[150px]">{item.fileName}</span>
                         <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                     </div>

                     <div className="grid grid-cols-2 gap-2">
                        <button 
                           onClick={() => onCreateLog('repair', item)}
                           className="flex items-center justify-center gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100 py-2 rounded-lg text-xs font-bold border border-orange-100 transition-colors"
                        >
                            <Wrench className="w-3 h-3" /> Log Repair
                        </button>
                        <button 
                           onClick={() => onCreateLog('panel', item)}
                           className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold border border-blue-100 transition-colors"
                        >
                            <Layers className="w-3 h-3" /> Log Panel
                        </button>
                     </div>
                 </div>
             </div>
         ))}
      </div>
    </div>
  );
};

export default DroneLab;
