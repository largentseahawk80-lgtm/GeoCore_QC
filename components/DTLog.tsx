
import React, { useState, useEffect } from 'react';
import { DTLog, GeoLocation } from '../types';
import { getSmartPosition, formatCoords } from '../services/geoService';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { TestTube, MapPin, Save, Loader2, CheckCircle, Signal, Edit, Trash2 } from 'lucide-react';

interface DTLogProps {
  onSave: (dt: DTLog) => void;
  onCancel?: () => void;
  initialData?: DTLog;
}

const DTLogComponent: React.FC<DTLogProps> = ({ onSave, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [sampleId, setSampleId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  
  // 5 Peel, 5 Shear
  const [peelValues, setPeelValues] = useState<string[]>(['', '', '', '', '']);
  const [shearValues, setShearValues] = useState<string[]>(['', '', '', '', '']);
  
  const [isPassing, setIsPassing] = useState(true);

  // Auto-Save
  const autoSaveKey = initialData?.id ? `autosave_dt_${initialData.id}` : 'autosave_dt_new';
  const currentData = { sampleId, machineId, location, peelValues, shearValues, isPassing };
  const { clearAutoSave } = useAutoSave(autoSaveKey, currentData);

  useEffect(() => {
    if (initialData) {
      setSampleId(initialData.sampleId);
      setMachineId(initialData.machineId);
      setLocation(initialData.locationGeo);
      setPeelValues(initialData.peelResults.map(String));
      setShearValues(initialData.shearResults.map(String));
      setIsPassing(initialData.passed);
    } else {
        // Check autosave
        const saved = localStorage.getItem(autoSaveKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSampleId(parsed.sampleId || '');
                setMachineId(parsed.machineId || '');
                setLocation(parsed.location || null);
                setPeelValues(parsed.peelValues || ['', '', '', '', '']);
                setShearValues(parsed.shearValues || ['', '', '', '', '']);
                setIsPassing(parsed.isPassing ?? true);
                return;
            } catch(e) { console.error(e); }
        }

        const savedMachine = localStorage.getItem('last_dt_machine');
        if (savedMachine) setMachineId(savedMachine);

        const lastSample = localStorage.getItem('last_dt_sample'); 
        if (lastSample) {
            const match = lastSample.match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[0], 10);
                const prefix = lastSample.slice(0, match.index);
                setSampleId(`${prefix}${num + 1}`);
            }
        }

        setLocation(null);
        setPeelValues(['', '', '', '', '']);
        setShearValues(['', '', '', '', '']);
        setIsPassing(true);
    }
  }, [initialData, autoSaveKey]);

  const handleVoiceData = (data: any) => {
     if (data.sampleId) setSampleId(data.sampleId.toUpperCase());
     if (data.machineId) setMachineId(data.machineId.toUpperCase());
     
     if (data.peelResults && Array.isArray(data.peelResults)) {
         const newPeels = [...peelValues];
         data.peelResults.slice(0, 5).forEach((val: number, idx: number) => {
             newPeels[idx] = String(val);
         });
         setPeelValues(newPeels);
     }

     if (data.shearResults && Array.isArray(data.shearResults)) {
         const newShears = [...shearValues];
         data.shearResults.slice(0, 5).forEach((val: number, idx: number) => {
             newShears[idx] = String(val);
         });
         setShearValues(newShears);
     }
  };

  const handleReset = () => {
      clearAutoSave();
      setSampleId('');
      setLocation(null);
      setPeelValues(['', '', '', '', '']);
      setShearValues(['', '', '', '', '']);
  };

  const handleCancel = () => {
      clearAutoSave();
      if (onCancel) onCancel();
  };

  const captureLocation = async () => {
    setLoading(true);
    try {
      const geo = await getSmartPosition();
      setLocation(geo);
    } catch (e) {
      alert("Could not get GPS location. Please allow permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    index: number, 
    value: string, 
    type: 'peel' | 'shear'
  ) => {
    if (value && isNaN(Number(value))) return;

    const newValues = type === 'peel' ? [...peelValues] : [...shearValues];
    newValues[index] = value;
    
    if (type === 'peel') setPeelValues(newValues);
    else setShearValues(newValues);
  };

  const calculateAverage = (values: string[]) => {
    const nums = values.map(v => Number(v)).filter(v => !isNaN(v) && v !== 0);
    if (nums.length === 0) return 0;
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  };

  const avgPeel = calculateAverage(peelValues);
  const avgShear = calculateAverage(shearValues);

  const handleSave = () => {
    if (!sampleId || !machineId || !location) {
      return;
    }

    const peelResults = peelValues.map(v => Number(v) || 0) as [number, number, number, number, number];
    const shearResults = shearValues.map(v => Number(v) || 0) as [number, number, number, number, number];

    const newLog: DTLog = {
      id: initialData?.id || crypto.randomUUID(),
      sampleId: sampleId.toUpperCase(),
      machineId: machineId.toUpperCase(),
      locationGeo: location,
      peelResults,
      shearResults,
      passed: isPassing,
      timestamp: initialData?.timestamp || Date.now()
    };

    localStorage.setItem('last_dt_machine', machineId.toUpperCase());
    localStorage.setItem('last_dt_sample', sampleId.toUpperCase());

    clearAutoSave();
    onSave(newLog);

    if (!initialData) {
        const match = sampleId.match(/(\d+)$/);
        if (match) {
            const num = parseInt(match[0], 10);
            const prefix = sampleId.slice(0, match.index);
            setSampleId(`${prefix}${num + 1}`);
        } else {
            setSampleId('');
        }

        setLocation(null); 
        setPeelValues(['', '', '', '', '']); 
        setShearValues(['', '', '', '', '']); 
        setIsPassing(true);
    }
  };

  const getAccuracyLevel = (acc: number) => {
    if (acc <= 6) return { label: 'Excellent', color: 'text-emerald-700 border-emerald-200' };
    if (acc <= 15) return { label: 'Good', color: 'text-amber-700 border-amber-200' };
    if (acc <= 20) return { label: 'Fair', color: 'text-blue-700 border-blue-200' };
    return { label: 'Poor', color: 'text-red-700 border-red-200' };
  };

  const isValid = sampleId && machineId && location && peelValues.every(v => v !== '') && shearValues.every(v => v !== '');

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <MagicMic logType="dt" onDataParsed={handleVoiceData} />

      <div className={`bg-white p-6 rounded-xl shadow-sm border ${initialData ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
        <h2 className="text-2xl font-bold text-black flex items-center gap-2 mb-6">
          <TestTube className="w-6 h-6 text-emerald-600" />
          {initialData ? `Editing Log: ${initialData.sampleId}` : 'Destructive Testing (DT) Log'}
        </h2>

        {/* Sample Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-black">Sample ID</label>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="DT-001"
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 pr-10 border bg-white text-black uppercase"
                    value={sampleId}
                    onChange={e => setSampleId(e.target.value.toUpperCase())}
                />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-black">Machine ID</label>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Welder #5"
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 pr-10 border bg-white text-black uppercase"
                    value={machineId}
                    onChange={e => setMachineId(e.target.value.toUpperCase())}
                />
            </div>
          </div>
        </div>

        {/* GPS Location */}
        <div className={`p-4 rounded-lg border-2 mb-8 transition-colors bg-white ${location ? 'border-emerald-500' : 'border-dashed border-slate-300'}`}>
           <div className="flex justify-between items-center mb-2">
             <span className="font-bold text-black">Sample Location</span>
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
                 <span className="font-semibold">Accuracy: ±{Math.round(location.accuracy)}m</span>
                 <span className="opacity-75">({getAccuracyLevel(location.accuracy).label})</span>
               </div>
             </div>
           ) : (
             <button 
               onClick={captureLocation}
               disabled={loading}
               className="w-full py-2 bg-slate-800 text-white rounded-md flex items-center justify-center gap-2 text-sm hover:bg-slate-900"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <MapPin className="w-4 h-4" />}
               {loading ? 'Averaging GPS...' : 'Capture Precise GPS'}
             </button>
           )}
        </div>

        {/* Results Grid */}
        <div className="mb-6">
          <h3 className="font-semibold text-black mb-2">Tensiometer Results (lbs)</h3>
          <div className="grid grid-cols-2 gap-8">
             {/* Peel Column */}
             <div>
                <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-bold uppercase text-slate-500">Peel</div>
                    <div className="text-xs bg-white border border-slate-300 px-2 py-0.5 rounded text-black font-mono font-bold">Avg: {avgPeel}</div>
                </div>
                <div className="space-y-2">
                   {peelValues.map((val, idx) => (
                     <div key={`peel-${idx}`} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-4">{idx + 1}</span>
                        <div className="relative w-full">
                            <input 
                              type="number" 
                              className="w-full p-2 pr-8 border border-slate-300 rounded text-center font-mono bg-white text-black"
                              value={val}
                              onChange={(e) => handleInputChange(idx, e.target.value, 'peel')}
                              placeholder="0"
                            />
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             {/* Shear Column */}
             <div>
                <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-bold uppercase text-slate-500">Shear</div>
                    <div className="text-xs bg-white border border-slate-300 px-2 py-0.5 rounded text-black font-mono font-bold">Avg: {avgShear}</div>
                </div>
                <div className="space-y-2">
                   {shearValues.map((val, idx) => (
                     <div key={`shear-${idx}`} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-4">{idx + 1}</span>
                        <div className="relative w-full">
                            <input 
                              type="number" 
                              className="w-full p-2 pr-8 border border-slate-300 rounded text-center font-mono bg-white text-black"
                              value={val}
                              onChange={(e) => handleInputChange(idx, e.target.value, 'shear')}
                              placeholder="0"
                            />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Pass/Fail Decision */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 mb-6">
           <div className="flex justify-between items-center">
             <span className="font-bold text-black">Overall Result</span>
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
              ${!isValid ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : isPassing ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            <Save className="w-5 h-5" />
            {initialData ? 'Update DT Log' : 'Save DT Log'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DTLogComponent;
