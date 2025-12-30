import React, { useState, useEffect, useRef } from 'react';
import { VacuumLog, GeoLocation } from '../types';
import { getSmartPosition, formatCoords, getAccuracyLevel } from '../services/geoService';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { BoxSelect, Save, Loader2, Signal, CheckCircle, MapPin, Camera, X, User, Calendar, Trash2 } from 'lucide-react';

interface VacuumLogProps {
  onSave: (log: VacuumLog) => void;
  onCancel?: () => void;
  initialData?: VacuumLog;
}

const VacuumLogComponent: React.FC<VacuumLogProps> = ({ onSave, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    logNumber: '',
    technician: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    photo: '',
  });

  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isPassing, setIsPassing] = useState(true);

  // Auto-Save
  const autoSaveKey = initialData?.id ? `autosave_vacuum_${initialData.id}` : 'autosave_vacuum_new';
  const currentData = { ...formData, location, isPassing };
  const { clearAutoSave } = useAutoSave(autoSaveKey, currentData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        logNumber: initialData.logNumber,
        technician: initialData.technician,
        date: initialData.date,
        notes: initialData.notes || '',
        photo: initialData.photo || '',
      });
      setLocation(initialData.locationGeo);
      setIsPassing(initialData.passed);
    } else {
      // Check autosave
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData({
            logNumber: parsed.logNumber || '',
            technician: parsed.technician || '',
            date: parsed.date || new Date().toISOString().split('T')[0],
            notes: parsed.notes || '',
            photo: parsed.photo || '',
          });
          setLocation(parsed.location || null);
          setIsPassing(parsed.isPassing ?? true);
          return;
        } catch (e) { console.error(e); }
      }

      // Defaults
      const savedTech = localStorage.getItem('last_vacuum_tech') || '';
      
      let nextId = '';
      const lastId = localStorage.getItem('last_vacuum_id');
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
        logNumber: nextId,
        photo: '',
      }));
      setLocation(null);
      setIsPassing(true);
    }
  }, [initialData, autoSaveKey]);

  const handleVoiceData = (data: any) => {
    setFormData(prev => ({
      ...prev,
      logNumber: data.logNumber ? data.logNumber.toUpperCase() : prev.logNumber,
      technician: data.technician ? data.technician.toUpperCase() : prev.technician,
      notes: data.notes ? (prev.notes + ' ' + data.notes).trim() : prev.notes,
    }));
  };

  const handleReset = () => {
    clearAutoSave();
    setFormData(prev => ({ ...prev, logNumber: '', notes: '', photo: '' }));
    setLocation(null);
    setIsPassing(true);
  };

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
    if (!formData.logNumber || !location || !formData.technician) return;

    const newLog: VacuumLog = {
      id: initialData?.id || crypto.randomUUID(),
      logNumber: formData.logNumber.toUpperCase(),
      technician: formData.technician.toUpperCase(),
      date: formData.date,
      locationGeo: location,
      passed: isPassing,
      notes: formData.notes,
      photo: formData.photo,
      timestamp: initialData?.timestamp || Date.now(),
    };

    localStorage.setItem('last_vacuum_tech', formData.technician.toUpperCase());
    localStorage.setItem('last_vacuum_id', formData.logNumber.toUpperCase());

    clearAutoSave();
    onSave(newLog);

    if (!initialData) {
        // Reset for next entry
        const match = formData.logNumber.match(/(\d+)$/);
        let nextId = '';
        if (match) {
            const num = parseInt(match[0], 10);
            const prefix = formData.logNumber.slice(0, match.index);
            nextId = `${prefix}${num + 1}`;
        }
        setFormData(prev => ({ ...prev, logNumber: nextId, notes: '', photo: '' }));
        setLocation(null);
        setIsPassing(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <MagicMic logType="vacuum" onDataParsed={handleVoiceData} />
      
      <div className={`bg-white p-6 rounded-xl shadow-sm border ${initialData?.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
        
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-white border border-teal-200 rounded-lg">
             <BoxSelect className="w-6 h-6 text-teal-600" />
          </div>
          <div>
             <h2 className="text-xl font-bold text-black">
               {initialData?.id ? `Editing Vacuum: ${initialData.logNumber}` : 'Vacuum Box Test'}
             </h2>
             <p className="text-xs text-slate-500">Log vacuum box non-destructive testing.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    Log Number / ID
                </label>
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="V-100"
                        className="w-full font-bold text-lg p-2 pr-10 border-b-2 border-slate-200 focus:border-teal-500 outline-none text-black bg-white uppercase"
                        value={formData.logNumber}
                        onChange={e => setFormData({...formData, logNumber: e.target.value.toUpperCase()})}
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
                        className="w-full font-medium p-2 pr-10 border-b-2 border-slate-200 focus:border-teal-500 outline-none text-black bg-white uppercase"
                        value={formData.technician}
                        onChange={e => setFormData({...formData, technician: e.target.value.toUpperCase()})}
                    />
                </div>
            </div>
        </div>
        
        <div className="mb-6">
             <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3"/> Date
             </label>
             <input 
               type="date"
               value={formData.date}
               onChange={e => setFormData({...formData, date: e.target.value})}
               className="w-full text-sm font-semibold p-2 border-b-2 border-slate-200 outline-none bg-white text-black"
             />
        </div>

        {/* Location Section */}
        <div className={`p-4 rounded-lg border-2 mb-6 transition-colors bg-white ${location ? 'border-emerald-500' : 'border-dashed border-slate-300'}`}>
           <div className="flex justify-between items-center mb-2">
             <span className="font-bold text-black">Test Location</span>
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
           className={`mb-6 p-4 rounded-lg border-2 border-dashed flex items-center justify-center relative cursor-pointer hover:bg-slate-50 transition-all ${formData.photo ? 'border-teal-300 bg-teal-50' : 'border-slate-300 bg-white'}`}
        >
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoCapture} />
             
             {formData.photo ? (
                 <div className="relative w-full h-40">
                    <img src={formData.photo} alt="Vacuum Test" className="w-full h-full object-contain rounded-md" />
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
                    <span className="text-xs font-bold text-slate-500 block">Attach Photo (Optional)</span>
                 </div>
             )}
        </div>

        <div className="mb-6">
            <label className="text-xs font-bold uppercase text-slate-500 mb-1">Notes</label>
            <textarea
                rows={3}
                placeholder="Bubbles observed? Leaks?"
                className="w-full p-2 rounded border border-slate-300 text-sm bg-white text-black"
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
            />
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-300 mb-6 flex justify-between items-center">
             <span className="font-bold text-black">Result</span>
             <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                <button 
                  onClick={() => setIsPassing(true)}
                  className={`px-4 py-1 rounded-md text-sm font-bold transition-colors ${isPassing ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  PASS
                </button>
                <button 
                  onClick={() => setIsPassing(false)}
                  className={`px-4 py-1 rounded-md text-sm font-bold transition-colors ${!isPassing ? 'bg-red-100 text-red-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  FAIL
                </button>
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
               onClick={onCancel}
               className="flex-1 py-4 bg-white border border-slate-300 text-black rounded-xl font-bold hover:bg-slate-50 transition-colors"
             >
               Cancel
             </button>
          )}
          <button
            onClick={handleSave}
            disabled={!formData.logNumber || !location || !formData.technician}
            className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
              ${(!formData.logNumber || !location || !formData.technician) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
          >
            <Save className="w-5 h-5" />
            {initialData?.id ? 'Update Vacuum Log' : 'Save Vacuum Log'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default VacuumLogComponent;