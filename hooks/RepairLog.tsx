import React, { useState, useEffect, useRef } from 'react';
import { RepairLog, GeoLocation, PanelLog, WelderLog } from '../types';
import { getSmartPosition, formatCoords, getAccuracyLevel, calculateDistanceFt } from '../services/geoService';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { Wrench, MapPin, Save, Loader2, Signal, CheckCircle, Ruler, Hash, User, Calculator, ScanSearch, Camera, X, Trash2 } from 'lucide-react';

interface RepairLogProps {
  onSave: (log: RepairLog) => void;
  onCancel?: () => void;
  initialData?: RepairLog;
  panels?: PanelLog[]; 
  welderLogs?: WelderLog[]; 
}

const RepairLogComponent: React.FC<RepairLogProps> = ({ onSave, onCancel, initialData, panels = [], welderLogs = [] }) => {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<{
    repairNumber: string;
    type: 'Patch' | 'Bead' | 'Grind' | 'Extrusion';
    nearestPanelId: string;
    size: string;
    technician: string;
    photo: string;
  }>({
    repairNumber: '',
    type: 'Patch',
    nearestPanelId: '',
    size: '',
    technician: '',
    photo: '',
  });
  
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [distFromAnchor, setDistFromAnchor] = useState<number | null>(null);

  // Auto-Save
  const autoSaveKey = initialData?.id ? `autosave_repair_${initialData.id}` : 'autosave_repair_new';
  const currentData = { ...formData, locationGeo: location, distanceFromStart: distFromAnchor };
  const { clearAutoSave } = useAutoSave(autoSaveKey, currentData);

  useEffect(() => {
    if (initialData) {
      const isPreFill = !initialData.id;

      setFormData({
        repairNumber: initialData.repairNumber,
        type: initialData.type,
        nearestPanelId: initialData.nearestPanelId || '',
        size: initialData.size || '',
        technician: initialData.technician || '',
        photo: initialData.photo || '',
      });
      setLocation(initialData.locationGeo || null);
      setDistFromAnchor(initialData.distanceFromStart || null);

      if (isPreFill) {
           const lastId = localStorage.getItem('last_repair_id'); 
           let nextId = 'R-101';
            if (lastId) {
                const match = lastId.match(/(\d+)$/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    const prefix = lastId.slice(0, match.index);
                    nextId = `${prefix}${num + 1}`;
                }
            }
            setFormData(prev => ({...prev, repairNumber: nextId}));
            const savedTech = localStorage.getItem('last_repair_tech') || '';
            if (savedTech) setFormData(prev => ({...prev, technician: savedTech}));
      }

    } else {
      // Check for autosave
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setFormData({
                repairNumber: parsed.repairNumber || '',
                type: parsed.type || 'Patch',
                nearestPanelId: parsed.nearestPanelId || '',
                size: parsed.size || '',
                technician: parsed.technician || '',
                photo: parsed.photo || '',
              });
              setLocation(parsed.locationGeo || null);
              setDistFromAnchor(parsed.distanceFromStart || null);
              return;
          } catch(e) { console.error(e); }
      }

      const savedTech = localStorage.getItem('last_repair_tech') || '';
      
      let nextId = '';
      const lastId = localStorage.getItem('last_repair_id'); 
      if (lastId) {
          const match = lastId.match(/(\d+)$/);
          if (match) {
              const num = parseInt(match[0], 10);
              const prefix = lastId.slice(0, match.index);
              nextId = `${prefix}${num + 1}`;
          }
      }

      setFormData(prev => ({
        ...prev,
        technician: savedTech,
        repairNumber: nextId,
        type: 'Patch',
        nearestPanelId: '',
        size: '',
        photo: '',
      }));
      setLocation(null);
      setDistFromAnchor(null);
    }
  }, [initialData, autoSaveKey]);

  const handleVoiceData = (data: any) => {
      setFormData(prev => ({
          ...prev,
          repairNumber: data.repairNumber ? data.repairNumber.toUpperCase() : prev.repairNumber,
          type: data.type || prev.type,
          nearestPanelId: data.nearestPanelId ? data.nearestPanelId.toUpperCase() : prev.nearestPanelId,
          size: data.size ? data.size.toUpperCase() : prev.size,
          technician: data.technician ? data.technician.toUpperCase() : prev.technician,
      }));
  };

  const handleReset = () => {
      clearAutoSave();
      setFormData(prev => ({ ...prev, repairNumber: '', nearestPanelId: '', size: '', photo: '' }));
      setLocation(null);
      setDistFromAnchor(null);
  };

  const handleCancel = () => {
    clearAutoSave();
    if (onCancel) onCancel();
  };

  useEffect(() => {
    if (location && formData.nearestPanelId) {
        const refPanel = panels.find(p => p.panelNumber === formData.nearestPanelId.toUpperCase());
        if (refPanel && refPanel.startGeo) {
            const dist = calculateDistanceFt(refPanel.startGeo, location);
            setDistFromAnchor(Math.round(dist));
            return;
        }

        const refSeam = welderLogs.find(s => s.seamId === formData.nearestPanelId.toUpperCase());
        if (refSeam && refSeam.startGeo) {
             const dist = calculateDistanceFt(refSeam.startGeo, location);
             setDistFromAnchor(Math.round(dist));
             return;
        }
        setDistFromAnchor(null);
    }
  }, [location, formData.nearestPanelId, panels, welderLogs]);

  const captureLocation = async () => {
    setLoading(true);
    try {
      const geo = await getSmartPosition();
      setLocation(geo);
    } catch (e) {
      alert("Could not get GPS location.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
     if (!location) {
         alert("Capture location first to auto-detect nearby features.");
         return;
     }
     setDetecting(true);
     try {
         let closestPanel = null;
         let minPanelDist = 999999;
         
         for (const p of panels) {
             if (p.startGeo) {
                 const d = calculateDistanceFt(location, p.startGeo);
                 if (d < minPanelDist) { minPanelDist = d; closestPanel = p; }
             }
         }

         let closestSeam = null;
         let minSeamDist = 999999;
         
         for (const s of welderLogs) {
             if (s.startGeo) {
                 const d = calculateDistanceFt(location, s.startGeo);
                 if (d < minSeamDist) { minSeamDist = d; closestSeam = s; }
             }
         }

         const MAX_DIST = 100;
         let winnerId = '';
         
         if (minPanelDist < minSeamDist && minPanelDist < MAX_DIST && closestPanel) {
             winnerId = closestPanel.panelNumber;
         } else if (minSeamDist < minPanelDist && minSeamDist < MAX_DIST && closestSeam) {
             winnerId = closestSeam.seamId;
         }

         if (winnerId) {
             setFormData(prev => ({ ...prev, nearestPanelId: winnerId }));
         } else {
             alert("No nearby Panels or Seams found within 100ft.");
         }

     } catch (e) {
         console.error(e);
     } finally {
         setDetecting(false);
     }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.repairNumber || !location || !formData.technician) return;

    const newLog: RepairLog = {
      id: initialData?.id || crypto.randomUUID(),
      repairNumber: formData.repairNumber.toUpperCase(),
      type: formData.type,
      locationGeo: location,
      nearestPanelId: formData.nearestPanelId.toUpperCase(),
      distanceFromStart: distFromAnchor || 0, 
      size: formData.size.toUpperCase(),
      technician: formData.technician.toUpperCase(),
      photo: formData.photo,
      timestamp: initialData?.timestamp || Date.now(),
    };

    localStorage.setItem('last_repair_tech', formData.technician.toUpperCase());
    localStorage.setItem('last_repair_id', formData.repairNumber.toUpperCase());

    clearAutoSave();
    onSave(newLog);

    if (!initialData || !initialData.id) {
        // Reset Logic
        const match = formData.repairNumber.match(/(\d+)$/);
        let nextId = '';
        if (match) {
            const num = parseInt(match[0], 10);
            const prefix = formData.repairNumber.slice(0, match.index);
            nextId = `${prefix}${num + 1}`;
        }
        setFormData(prev => ({ ...prev, repairNumber: nextId, size: '', nearestPanelId: '', photo: '' }));
        setLocation(null);
        setDistFromAnchor(null);
    }
  };

  const repairTypes = ['Patch', 'Bead', 'Grind', 'Extrusion'];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <MagicMic logType="repair" onDataParsed={handleVoiceData} />
      
      <div className={`bg-white p-6 rounded-xl shadow-sm border ${initialData?.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
        
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-white border border-orange-200 rounded-lg">
             <Wrench className="w-6 h-6 text-orange-600" />
          </div>
          <div>
             <h2 className="text-xl font-bold text-black">
               {initialData?.id ? `Editing Repair: ${initialData.repairNumber}` : 'Log Correction / Repair'}
             </h2>
             <p className="text-xs text-slate-500">Record patches, grind repairs, and defects.</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-6">
            {repairTypes.map(type => (
                <button
                   key={type}
                   onClick={() => setFormData(prev => ({ ...prev, type: type as any }))}
                   className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                       formData.type === type 
                       ? 'bg-white border-orange-500 text-black' 
                       : 'bg-white border-slate-200 text-slate-500 hover:text-black'
                   }`}
                >
                    {type}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3"/> Repair ID
                </label>
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="R-101"
                        className="w-full font-bold text-lg p-2 pr-10 border-b-2 border-slate-200 focus:border-orange-500 outline-none text-black bg-white uppercase"
                        value={formData.repairNumber}
                        onChange={e => setFormData({...formData, repairNumber: e.target.value.toUpperCase()})}
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3"/> Technician
                </label>
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="Initials"
                        className="w-full font-medium p-2 pr-10 border-b-2 border-slate-200 focus:border-orange-500 outline-none text-black bg-white uppercase"
                        value={formData.technician}
                        onChange={e => setFormData({...formData, technician: e.target.value.toUpperCase()})}
                    />
                </div>
            </div>
        </div>

        {/* Location Section */}
        <div className={`p-4 rounded-lg border-2 mb-6 transition-colors bg-white ${location ? 'border-emerald-500' : 'border-dashed border-slate-300'}`}>
           <div className="flex justify-between items-center mb-2">
             <span className="font-bold text-black">Repair Location</span>
             {location && <CheckCircle className="w-5 h-5 text-emerald-600" />}
           </div>
           
           {location ? (
             <div>
               <div className="text-xs text-black font-mono flex justify-between items-center mb-2">
                 {formatCoords(location)}
                 <button onClick={captureLocation} className="text-xs underline text-slate-500 hover:text-black">Retake</button>
               </div>
               <div className={`flex items-center gap-2 text-xs border rounded-md px-2 py-1 w-fit ${getAccuracyLevel(location.accuracy).color}`}>
                 <Signal className="w-3 h-3" />
                 <span className="font-semibold text-black">Accuracy: ±{Math.round(location.accuracy)}m</span>
               </div>
             </div>
           ) : (
             <button 
               onClick={captureLocation}
               disabled={loading}
               className="w-full py-3 bg-slate-800 text-white rounded-md flex items-center justify-center gap-2 text-sm hover:bg-slate-900"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <MapPin className="w-4 h-4" />}
               {loading ? 'Smart GPS Averaging...' : 'Capture Precise Location'}
             </button>
           )}
        </div>

        {/* Photo Section */}
        <div 
           onClick={() => !formData.photo && fileInputRef.current?.click()}
           className={`mb-6 p-4 rounded-lg border-2 border-dashed flex items-center justify-center relative cursor-pointer hover:bg-slate-50 transition-all ${formData.photo ? 'border-orange-300 bg-orange-50' : 'border-slate-300 bg-white'}`}
        >
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoCapture} />
             
             {formData.photo ? (
                 <div className="relative w-full h-40">
                    <img src={formData.photo} alt="Repair" className="w-full h-full object-contain rounded-md" />
                    <button 
                       onClick={(e) => { e.stopPropagation(); setFormData(p => ({...p, photo: ''})); }}
                       className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-md m-1 hover:bg-red-600"
                    >
                       <X className="w-4 h-4" />
                    </button>
                 </div>
             ) : (
                 <div className="text-center">
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs font-bold text-slate-500 block">Attach Repair Photo</span>
                 </div>
             )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-lg border border-slate-300">
             <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                        Ref (Panel/Seam)
                    </label>
                    <button 
                        onClick={handleAutoDetect} 
                        disabled={detecting || !location}
                        className="text-[10px] text-indigo-600 uppercase font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                        {detecting ? <Loader2 className="w-3 h-3 animate-spin"/> : <ScanSearch className="w-3 h-3" />}
                        Detect
                    </button>
                </div>
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="e.g. P-105"
                        className="w-full p-2 pr-10 rounded border border-slate-300 text-sm bg-white text-black uppercase"
                        value={formData.nearestPanelId}
                        onChange={e => setFormData({...formData, nearestPanelId: e.target.value.toUpperCase()})}
                    />
                </div>
             </div>
             
             <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    {distFromAnchor !== null ? <Calculator className="w-3 h-3 text-indigo-500"/> : <Ruler className="w-3 h-3"/>} 
                    Dist. from Start
                </label>
                {distFromAnchor !== null ? (
                    <div className="w-full p-2 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center gap-2">
                        {distFromAnchor} ft
                        <span className="text-[10px] uppercase text-indigo-400 font-normal">(GPS Calc)</span>
                    </div>
                ) : (
                    <div className="w-full p-2 rounded border border-slate-200 bg-slate-50 text-slate-400 text-sm italic">
                        Enter Ref to Calc
                    </div>
                )}
             </div>

             <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    Size / Dimensions
                </label>
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="e.g. 6x6 inch"
                        className="w-full p-2 pr-10 rounded border border-slate-300 text-sm bg-white text-black uppercase"
                        value={formData.size}
                        onChange={e => setFormData({...formData, size: e.target.value.toUpperCase()})}
                    />
                </div>
             </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="p-4 bg-white border border-slate-300 text-slate-400 rounded-xl hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Clear Form"
          >
             <Trash2 className="w-5 h-5" />
          </button>
          {onCancel && (
             <button
               onClick={handleCancel}
               className="flex-1 py-4 bg-white border border-slate-300 text-black rounded-xl font-bold hover:bg-slate-50 transition-colors"
             >
               Cancel
             </button>
          )}
          <button
            onClick={handleSave}
            disabled={!formData.repairNumber || !location || !formData.technician}
            className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
              ${(!formData.repairNumber || !location || !formData.technician) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
          >
            <Save className="w-5 h-5" />
            {initialData?.id ? 'Update Repair' : 'Save Repair'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default RepairLogComponent;