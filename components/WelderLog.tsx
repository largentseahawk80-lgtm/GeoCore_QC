import React, { useState, useEffect, useRef } from 'react';
import { WelderLog, GeoLocation } from '../types';
import { getSmartPosition, calculateDistanceFt, formatCoords } from '../services/geoService';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { Zap, Play, Square, Save, Loader2, Signal, CheckCircle, Ruler, Camera, X, Trash2 } from 'lucide-react';

interface WelderLogProps {
  onSave: (log: WelderLog) => void;
  onCancel?: () => void;
  initialData?: WelderLog;
}

const WelderLogComponent: React.FC<WelderLogProps> = ({ onSave, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<{
    seamId: string;
    type: 'Wedge' | 'Extrusion';
    machineId: string;
    technician: string;
    temperature: string;
    speed: string;
    date: string;
    startTime: string;
    endTime: string;
    photo: string;
  }>({
    seamId: '',
    type: 'Wedge',
    machineId: '',
    technician: '',
    temperature: '',
    speed: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    photo: '',
  });

  const [startGeo, setStartGeo] = useState<GeoLocation | null>(null);
  const [endGeo, setEndGeo] = useState<GeoLocation | null>(null);
  const [calculatedLength, setCalculatedLength] = useState<number>(0);

  // Auto-Save
  const autoSaveKey = initialData?.id ? `autosave_seam_${initialData.id}` : 'autosave_seam_new';
  const currentData = { ...formData, startGeo, endGeo, calculatedLength };
  const { clearAutoSave } = useAutoSave(autoSaveKey, currentData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        seamId: initialData.seamId,
        type: initialData.type,
        machineId: initialData.machineId,
        technician: initialData.technician,
        temperature: String(initialData.temperature),
        speed: String(initialData.speed || ''),
        date: initialData.date,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        photo: initialData.photo || '',
      });
      setStartGeo(initialData.startGeo);
      setEndGeo(initialData.endGeo || null);
      setCalculatedLength(initialData.calculatedLengthFt || 0);
    } else {
      // Check autosave
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setFormData({
                seamId: parsed.seamId || '',
                type: parsed.type || 'Wedge',
                machineId: parsed.machineId || '',
                technician: parsed.technician || '',
                temperature: parsed.temperature || '',
                speed: parsed.speed || '',
                date: parsed.date || new Date().toISOString().split('T')[0],
                startTime: parsed.startTime || '',
                endTime: parsed.endTime || '',
                photo: parsed.photo || '',
              });
              setStartGeo(parsed.startGeo || null);
              setEndGeo(parsed.endGeo || null);
              setCalculatedLength(parsed.calculatedLength || 0);
              return;
          } catch(e) { console.error(e); }
      }

      const savedTech = localStorage.getItem('last_welder_tech') || '';
      const savedMachine = localStorage.getItem('last_welder_machine') || '';
      const savedType = (localStorage.getItem('last_welder_type') as 'Wedge' | 'Extrusion') || 'Wedge';
      
      const now = new Date();
      
      setFormData(prev => ({
        ...prev,
        technician: savedTech,
        machineId: savedMachine,
        type: savedType,
        startTime: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        photo: '',
      }));
      
      const lastId = localStorage.getItem('last_seam_id');
      if (lastId) {
        const match = lastId.match(/(\d+)$/);
        if (match) {
           const num = parseInt(match[0], 10);
           const prefix = lastId.slice(0, match.index);
           setFormData(prev => ({ ...prev, seamId: `${prefix}${num + 1}` }));
        }
      }
    }
  }, [initialData, autoSaveKey]);

  const handleVoiceData = (data: any) => {
    setFormData(prev => ({
      ...prev,
      seamId: data.seamId ? data.seamId.toUpperCase() : prev.seamId,
      type: data.type || prev.type,
      machineId: data.machineId ? data.machineId.toUpperCase() : prev.machineId,
      technician: data.technician ? data.technician.toUpperCase() : prev.technician,
      temperature: data.temperature ? String(data.temperature) : prev.temperature,
      speed: data.speed ? String(data.speed) : prev.speed,
    }));
  };

  const handleReset = () => {
      clearAutoSave();
      setFormData(prev => ({ ...prev, seamId: '', startTime: '', endTime: '', photo: '' }));
      setStartGeo(null);
      setEndGeo(null);
      setCalculatedLength(0);
  };

  const handleCancel = () => {
      clearAutoSave();
      if (onCancel) onCancel();
  };

  const captureStart = async () => {
    setLoading(true);
    try {
      const geo = await getSmartPosition();
      setStartGeo(geo);
      setFormData(prev => ({ ...prev, startTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }));
    } catch (err) {
      alert("GPS Error");
    } finally {
      setLoading(false);
    }
  };

  const captureEnd = async () => {
    setLoading(true);
    try {
      const geo = await getSmartPosition();
      setEndGeo(geo);
      setFormData(prev => ({ ...prev, endTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }));
      if (startGeo) {
        const length = calculateDistanceFt(startGeo, geo);
        setCalculatedLength(Math.round(length));
      }
    } catch (err) {
      alert("GPS Error");
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
    if (!formData.seamId || !formData.machineId || !startGeo) return;

    const newLog: WelderLog = {
      id: initialData?.id || crypto.randomUUID(),
      seamId: formData.seamId.toUpperCase(),
      type: formData.type,
      machineId: formData.machineId.toUpperCase(),
      technician: formData.technician.toUpperCase(),
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      temperature: Number(formData.temperature),
      speed: formData.type === 'Wedge' ? Number(formData.speed) : undefined,
      startGeo,
      endGeo: endGeo || undefined,
      calculatedLengthFt: calculatedLength,
      timestamp: initialData?.timestamp || Date.now(),
      photo: formData.photo,
    };

    localStorage.setItem('last_welder_tech', formData.technician.toUpperCase());
    localStorage.setItem('last_welder_machine', formData.machineId.toUpperCase());
    localStorage.setItem('last_welder_type', formData.type);
    localStorage.setItem('last_seam_id', formData.seamId.toUpperCase());

    clearAutoSave();
    onSave(newLog);

    if (!initialData) {
        const match = formData.seamId.match(/(\d+)$/);
        let nextId = '';
        if (match) {
            const num = parseInt(match[0], 10);
            const prefix = formData.seamId.slice(0, match.index);
            nextId = `${prefix}${num + 1}`;
        }
        setFormData(prev => ({ ...prev, seamId: nextId, startTime: '', endTime: '', photo: '' }));
        setStartGeo(null);
        setEndGeo(null);
        setCalculatedLength(0);
    }
  };

  const getAccuracyLevel = (acc: number) => {
    if (acc <= 6) return { label: 'Excellent', color: 'text-emerald-700 border-emerald-200' };
    if (acc <= 15) return { label: 'Good', color: 'text-amber-700 border-amber-200' };
    if (acc <= 20) return { label: 'Fair', color: 'text-blue-700 border-blue-200' };
    return { label: 'Poor', color: 'text-red-700 border-red-200' };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <MagicMic logType="welder" onDataParsed={handleVoiceData} />

      <div className={`bg-white p-6 rounded-xl shadow-sm border ${initialData ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
        
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-white border border-blue-200 rounded-lg">
             <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
             <h2 className="text-xl font-bold text-black">
               {initialData ? `Editing Seam: ${initialData.seamId}` : 'Production Seam Log'}
             </h2>
             <p className="text-xs text-slate-500">Log Wedge and Hand Welding production seams.</p>
          </div>
        </div>

        {/* Type Selection */}
        <div className="flex gap-4 mb-6">
             <button
               onClick={() => setFormData(p => ({ ...p, type: 'Wedge' }))}
               className={`flex-1 py-3 border rounded-lg font-bold text-sm transition-all ${formData.type === 'Wedge' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-slate-200 text-slate-400 hover:text-black'}`}
             >
               Wedge Welder
             </button>
             <button
               onClick={() => setFormData(p => ({ ...p, type: 'Extrusion' }))}
               className={`flex-1 py-3 border rounded-lg font-bold text-sm transition-all ${formData.type === 'Extrusion' ? 'border-orange-500 bg-white text-orange-600 shadow-sm' : 'border-slate-200 text-slate-400 hover:text-black'}`}
             >
               Hand / Extrusion
             </button>
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
             <label className="text-xs font-bold uppercase text-slate-500 mb-1">Seam ID</label>
             <div className="relative">
                <input 
                    value={formData.seamId}
                    onChange={e => setFormData({...formData, seamId: e.target.value.toUpperCase()})}
                    placeholder="S-101"
                    className="w-full text-lg font-bold p-2 pr-10 border-b-2 border-slate-200 focus:border-blue-500 outline-none bg-white text-black uppercase"
                />
             </div>
          </div>
          <div>
             <label className="text-xs font-bold uppercase text-slate-500 mb-1">Date</label>
             <input 
               type="date"
               value={formData.date}
               onChange={e => setFormData({...formData, date: e.target.value})}
               className="w-full text-sm font-semibold p-2 border-b-2 border-slate-200 outline-none bg-white text-black"
             />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1">Machine #</label>
              <div className="relative">
                <input 
                    value={formData.machineId}
                    onChange={e => setFormData({...formData, machineId: e.target.value.toUpperCase()})}
                    placeholder="W-05"
                    className="w-full p-2 pr-10 border border-slate-300 rounded text-black bg-white uppercase"
                />
              </div>
           </div>
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1">Tech Initials</label>
              <div className="relative">
                <input 
                    value={formData.technician}
                    onChange={e => setFormData({...formData, technician: e.target.value.toUpperCase()})}
                    className="w-full p-2 pr-10 border border-slate-300 rounded text-black bg-white uppercase"
                />
              </div>
           </div>
        </div>

        {/* Machine Params */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1">Temp</label>
              <div className="relative">
                <input 
                    type="number"
                    value={formData.temperature}
                    onChange={e => setFormData({...formData, temperature: e.target.value})}
                    placeholder="750"
                    className="w-full p-2 pr-10 border border-slate-300 rounded bg-white text-black"
                />
              </div>
           </div>
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1">Speed</label>
              <div className="relative">
                <input 
                    type="number"
                    disabled={formData.type === 'Extrusion'}
                    value={formData.speed}
                    onChange={e => setFormData({...formData, speed: e.target.value})}
                    className={`w-full p-2 pr-10 border border-slate-300 rounded text-black ${formData.type === 'Extrusion' ? 'bg-slate-200' : 'bg-white'}`}
                />
              </div>
           </div>
        </div>

        {/* Photo Section */}
        <div 
           onClick={() => !formData.photo && fileInputRef.current?.click()}
           className={`mb-6 p-4 rounded-lg border-2 border-dashed flex items-center justify-center relative cursor-pointer hover:bg-slate-50 transition-all ${formData.photo ? 'border-blue-300 bg-blue-50' : 'border-slate-300 bg-white'}`}
        >
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoCapture} />
             {formData.photo ? (
                 <div className="relative w-full h-40">
                    <img src={formData.photo} alt="Seam" className="w-full h-full object-contain rounded-md" />
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
                    <span className="text-xs font-bold text-slate-500 block">Attach Seam Photo</span>
                 </div>
             )}
        </div>

        {/* GPS Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg border-2 relative bg-white ${startGeo ? 'border-emerald-500' : 'border-dashed border-slate-300'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-black">Start Point</span>
              {startGeo && <CheckCircle className="w-5 h-5 text-emerald-600" />}
            </div>
            {startGeo ? (
              <div className="text-xs">
                <div className="font-mono text-black">{formatCoords(startGeo)}</div>
                <div className="text-slate-500 mt-1">{formData.startTime}</div>
                <div className={`mt-2 flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border w-fit ${getAccuracyLevel(startGeo.accuracy).color}`}>
                   <Signal className="w-3 h-3" />
                   {getAccuracyLevel(startGeo.accuracy).label}
                </div>
              </div>
            ) : (
              <button 
                onClick={captureStart}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4" />}
                {loading ? 'Averaging...' : 'Capture Start'}
              </button>
            )}
          </div>

          <div className={`p-4 rounded-lg border-2 relative bg-white ${endGeo ? 'border-emerald-500' : 'border-dashed border-slate-300'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-black">End Point</span>
              {endGeo && <CheckCircle className="w-5 h-5 text-emerald-600" />}
            </div>
            {endGeo ? (
              <div className="text-xs">
                <div className="font-mono text-black">{formatCoords(endGeo)}</div>
                <div className="text-slate-500 mt-1">{formData.endTime}</div>
                <div className={`mt-2 flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border w-fit ${getAccuracyLevel(endGeo.accuracy).color}`}>
                   <Signal className="w-3 h-3" />
                   {getAccuracyLevel(endGeo.accuracy).label}
                </div>
              </div>
            ) : (
              <button 
                onClick={captureEnd}
                disabled={!startGeo || loading}
                className={`w-full py-3 rounded-md flex items-center justify-center gap-2 ${!startGeo ? 'bg-slate-200 text-slate-400' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Square className="w-4 h-4" />}
                {loading ? 'Averaging...' : 'Capture End'}
              </button>
            )}
          </div>
        </div>

        {calculatedLength > 0 && (
          <div className="bg-white border border-blue-200 p-4 rounded-lg mb-6 flex items-center gap-3">
               <div className="p-2 bg-blue-50 rounded-lg">
                 <Ruler className="w-6 h-6 text-blue-600" />
               </div>
               <div>
                  <span className="block text-xs text-blue-600 uppercase font-bold">Calculated Length</span>
                  <span className="text-2xl font-bold text-black">{calculatedLength} ft</span>
               </div>
          </div>
        )}

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
            disabled={!formData.seamId || !startGeo}
            className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
              ${(!formData.seamId || !startGeo) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Save className="w-5 h-5" />
            {initialData?.id ? 'Update Seam' : 'Save Seam Log'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelderLogComponent;