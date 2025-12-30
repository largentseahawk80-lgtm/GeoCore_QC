
import React, { useState, useEffect } from 'react';
import { AirTestLog, GeoLocation } from '../types';
import { getSmartPosition, formatCoords } from '../services/geoService';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { Wind, Save, Timer, Activity, Calendar, User, MapPin, Loader2, Signal, CheckCircle, Trash2 } from 'lucide-react';

interface AirTestLogProps {
  onSave: (log: AirTestLog) => void;
  onCancel?: () => void;
  initialData?: AirTestLog;
}

const addMinutes = (timeStr: string, minutes: number) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h);
  date.setMinutes(m + minutes);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const AirTestLogComponent: React.FC<AirTestLogProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    seamId: '',
    technician: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    startPressure: '',
    endPressure: '',
  });
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isPassing, setIsPassing] = useState(true);

  // Auto-Save
  const autoSaveKey = initialData?.id ? `autosave_air_${initialData.id}` : 'autosave_air_new';
  const currentData = { ...formData, location, isPassing };
  const { clearAutoSave } = useAutoSave(autoSaveKey, currentData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        seamId: initialData.seamId,
        technician: initialData.technician,
        date: initialData.date,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        startPressure: String(initialData.startPressure),
        endPressure: String(initialData.endPressure),
      });
      setLocation(initialData.locationGeo);
      setIsPassing(initialData.passed);
    } else {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setFormData({
                seamId: parsed.seamId || '',
                technician: parsed.technician || '',
                date: parsed.date || new Date().toISOString().split('T')[0],
                startTime: parsed.startTime || '',
                endTime: parsed.endTime || '',
                startPressure: parsed.startPressure || '',
                endPressure: parsed.endPressure || '',
              });
              setLocation(parsed.location || null);
              setIsPassing(parsed.isPassing ?? true);
              return;
          } catch(e) { console.error(e); }
      }

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const timeString = `${hh}:${mm}`;
      const endTimeString = addMinutes(timeString, 5);
      
      const savedTech = localStorage.getItem('last_air_tech') || '';

      setFormData(prev => ({
        ...prev,
        seamId: '',
        technician: savedTech,
        startPressure: '',
        endPressure: '',
        startTime: timeString, 
        endTime: endTimeString, 
      }));
      setLocation(null);
      setIsPassing(true);
    }
  }, [initialData, autoSaveKey]);

  const handleVoiceData = (data: any) => {
    setFormData(prev => ({
      ...prev,
      seamId: data.seamId ? data.seamId.toUpperCase() : prev.seamId,
      technician: data.technician ? data.technician.toUpperCase() : prev.technician,
      startPressure: data.startPressure ? String(data.startPressure) : prev.startPressure,
      endPressure: data.endPressure ? String(data.endPressure) : prev.endPressure,
    }));
  };

  const handleReset = () => {
      clearAutoSave();
      setFormData(prev => ({ ...prev, seamId: '', startPressure: '', endPressure: '' }));
      setLocation(null);
      setIsPassing(true);
  };

  const handleCancel = () => {
      clearAutoSave();
      if (onCancel) onCancel();
  };

  const captureLocation = async () => {
    setLoadingLocation(true);
    try {
      const geo = await getSmartPosition();
      setLocation(geo);
    } catch (e) {
      alert("Could not get GPS location. Please allow permissions.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const getAccuracyLevel = (acc: number) => {
    if (acc <= 6) return { label: 'Excellent', color: 'text-emerald-700 border-emerald-200' };
    if (acc <= 15) return { label: 'Good', color: 'text-amber-700 border-amber-200' };
    if (acc <= 20) return { label: 'Fair', color: 'text-blue-700 border-blue-200' };
    return { label: 'Poor', color: 'text-red-700 border-red-200' };
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    const newEnd = addMinutes(newStart, 5);
    setFormData(prev => ({ ...prev, startTime: newStart, endTime: newEnd }));
  };

  const handleSave = () => {
    if (!formData.seamId || !formData.technician || !formData.startPressure || !formData.endPressure || !location) {
      return;
    }

    const newLog: AirTestLog = {
      id: initialData?.id || crypto.randomUUID(),
      seamId: formData.seamId.toUpperCase(),
      technician: formData.technician.toUpperCase(),
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      startPressure: Number(formData.startPressure),
      endPressure: Number(formData.endPressure),
      passed: isPassing,
      timestamp: initialData?.timestamp || Date.now(),
      locationGeo: location,
    };

    localStorage.setItem('last_air_tech', formData.technician.toUpperCase());

    clearAutoSave();
    onSave(newLog);

    if (!initialData) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hh}:${mm}`;
        const endTimeString = addMinutes(timeString, 5);

        setFormData(prev => ({
            ...prev,
            seamId: '',
            startPressure: '',
            endPressure: '',
            startTime: timeString,
            endTime: endTimeString,
        }));
        setLocation(null);
        setIsPassing(true);
    }
  };

  const isValid = 
    formData.seamId && 
    formData.technician && 
    formData.startTime && 
    formData.endTime &&
    formData.startPressure &&
    formData.endPressure &&
    location;

  const pressureDrop = (Number(formData.startPressure) - Number(formData.endPressure)).toFixed(1);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <MagicMic logType="airTest" onDataParsed={handleVoiceData} />

      <div className={`bg-white rounded-xl shadow-lg border overflow-hidden ${initialData ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
        
        {/* Header Section */}
        <div className="bg-white p-6 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-4">
             <Wind className="w-6 h-6 text-sky-600" />
             <h2 className="text-xl font-bold text-black">
                {initialData ? `Editing Air Test: ${initialData.seamId}` : 'Air Pressure Test'}
             </h2>
          </div>
          
          <div className="relative">
            <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-bold text-sky-600 uppercase">Seam ID / Number</label>
            <input 
              type="text" 
              placeholder="S-101"
              required
              className="block w-full rounded-lg border-2 border-slate-300 shadow-sm p-3 pr-10 text-lg font-bold text-black focus:border-sky-500 focus:ring-sky-500 outline-none uppercase placeholder:text-slate-300 bg-white"
              value={formData.seamId}
              onChange={e => setFormData({...formData, seamId: e.target.value.toUpperCase()})}
            />
          </div>
        </div>

        {/* GPS Location Section */}
        <div className="p-5 bg-white border-b border-slate-200">
           {!location ? (
             <button 
                onClick={captureLocation}
                disabled={loadingLocation}
                className="group w-full py-4 bg-white border-2 border-indigo-100 hover:border-indigo-500 text-indigo-700 rounded-xl flex items-center justify-center gap-3 shadow-sm transition-all"
             >
                {loadingLocation ? (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                ) : (
                  <div className="bg-white border border-indigo-200 p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                  </div>
                )}
                <div className="text-left">
                  <span className="block font-bold text-lg text-black">Drop Location Pin 📍</span>
                  <span className="block text-xs text-indigo-600 font-medium">{loadingLocation ? "Averaging GPS..." : "Smart GPS Capture"}</span>
                </div>
             </button>
           ) : (
             <div className="relative bg-white rounded-xl border border-indigo-200 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-sm">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Lat / Lon Coordinates</div>
                        <div className="font-mono text-sm font-bold text-black">
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </div>
                      </div>
                   </div>
                   <button 
                      onClick={captureLocation} 
                      className="text-xs font-semibold text-indigo-600 hover:text-black bg-white border border-indigo-200 px-3 py-1.5 rounded-md hover:shadow-sm transition-all"
                   >
                     Retake
                   </button>
                </div>
                
                <div className="flex items-center gap-4 mt-2">
                   <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${getAccuracyLevel(location.accuracy).color}`}>
                      <Signal className="w-3.5 h-3.5" />
                      <span className="font-bold text-black">Accuracy: ±{Math.round(location.accuracy)}m</span>
                      <span className="opacity-80 text-black">({getAccuracyLevel(location.accuracy).label})</span>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* The "Field Log Cross" Layout */}
        <div className="relative border-b border-slate-200 bg-white">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-100 transform -translate-x-1/2 z-10"></div>
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 transform -translate-y-1/2 z-10"></div>

            {/* Quadrant 1: Start Time */}
            <div className="grid grid-cols-2 h-64">
                <div className="p-4 flex flex-col justify-center items-center text-center relative hover:bg-slate-50 transition-colors group">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-black transition-colors">
                        <Timer className="w-3 h-3"/> Start Time
                    </span>
                    <input 
                        type="time" 
                        className="w-full text-center font-bold text-xl bg-transparent border-b border-dashed border-slate-200 focus:border-sky-500 outline-none p-1 text-black"
                        value={formData.startTime}
                        onChange={handleStartTimeChange}
                    />
                </div>

                {/* Quadrant 2: Start Pressure */}
                <div className="p-4 flex flex-col justify-center items-center text-center relative hover:bg-slate-50 transition-colors group">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-black transition-colors">
                        <Activity className="w-3 h-3"/> Start PSI
                    </span>
                    <input 
                        type="number" 
                        step="0.1"
                        placeholder="30"
                        className="w-24 text-center font-mono font-bold text-3xl bg-transparent border-b border-dashed border-slate-200 focus:border-sky-500 outline-none p-1 text-black placeholder:text-slate-200"
                        value={formData.startPressure}
                        onChange={e => setFormData({...formData, startPressure: e.target.value})}
                    />
                </div>

                {/* Quadrant 3: End Time */}
                <div className="p-4 flex flex-col justify-center items-center text-center relative hover:bg-slate-50 transition-colors group">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-black transition-colors">
                        <Timer className="w-3 h-3"/> End Time (+5m)
                    </span>
                    <input 
                        type="time" 
                        className="w-full text-center font-bold text-xl bg-transparent border-b border-dashed border-slate-200 focus:border-sky-500 outline-none p-1 text-black"
                        value={formData.endTime}
                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                    />
                </div>

                {/* Quadrant 4: End Pressure */}
                <div className="p-4 flex flex-col justify-center items-center text-center relative hover:bg-slate-50 transition-colors group">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-black transition-colors">
                        <Activity className="w-3 h-3"/> End PSI
                    </span>
                    <input 
                        type="number" 
                        step="0.1"
                        placeholder="28"
                        className="w-24 text-center font-mono font-bold text-3xl bg-transparent border-b border-dashed border-slate-200 focus:border-sky-500 outline-none p-1 text-black placeholder:text-slate-200"
                        value={formData.endPressure}
                        onChange={e => setFormData({...formData, endPressure: e.target.value})}
                    />
                </div>
            </div>
        </div>

        {/* Footer: Date & Tech */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-white">
            <div className="p-4">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3"/> Date
                </label>
                <input 
                  type="date" 
                  required
                  className="block w-full bg-transparent text-sm font-semibold text-black outline-none"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
            </div>
            <div className="p-4">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3"/> Tech Initials
                </label>
                <div className="relative">
                    <input 
                    type="text" 
                    placeholder="Initials"
                    required
                    className="block w-full bg-transparent text-sm font-semibold text-black outline-none uppercase placeholder:text-slate-300 pr-8"
                    value={formData.technician}
                    onChange={e => setFormData({...formData, technician: e.target.value.toUpperCase()})}
                    />
                </div>
            </div>
        </div>

        {/* Results & Action */}
        <div className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
                <div>
                     <div className="text-xs text-slate-400 uppercase font-bold">Pressure Drop</div>
                     <div className={`text-2xl font-mono font-bold ${Number(pressureDrop) > 4 ? 'text-red-600' : 'text-black'}`}>
                        {formData.startPressure && formData.endPressure ? `${pressureDrop} psi` : '--'}
                     </div>
                </div>

                <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                    <button 
                      onClick={() => setIsPassing(true)}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-all shadow-sm ${isPassing ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-black'}`}
                    >
                      PASS
                    </button>
                    <button 
                      onClick={() => setIsPassing(false)}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-all shadow-sm ${!isPassing ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-black'}`}
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
                  onClick={handleCancel}
                  className="flex-1 py-4 bg-white border border-slate-300 text-black rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!isValid}
                className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                  ${!isValid ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : isPassing ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                <Save className="w-5 h-5" />
                {initialData ? 'Update Record' : 'Save Record'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AirTestLogComponent;
