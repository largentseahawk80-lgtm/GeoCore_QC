import React, { useState, useEffect, useRef } from 'react';
import { PanelLog, GeoLocation, MaterialCategory } from '../types';
import { getSmartPosition, calculateDistanceFt, formatCoords, isDemoMode } from '../services/geoService';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { Layers, ScanBarcode, Save, Loader2, Play, Square, Signal, CheckCircle, RefreshCw, Ruler, Camera, X, Trash2 } from 'lucide-react';

interface PanelLogProps {
  onSave: (panel: PanelLog) => void;
  onCancel?: () => void;
  defaults: {
    widthFt: number;
    materialType: string;
    category: MaterialCategory;
  };
  onDefaultsChange: (defaults: { widthFt: number; materialType: string; category: MaterialCategory }) => void;
  initialData?: PanelLog;
}

const PanelLogComponent: React.FC<PanelLogProps> = ({ onSave, onCancel, defaults, onDefaultsChange, initialData }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [category, setCategory] = useState<MaterialCategory>(defaults.category);
  const [panelNumber, setPanelNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [widthFt, setWidthFt] = useState(defaults.widthFt);
  const [materialType, setMaterialType] = useState(defaults.materialType);
  const [startTime, setStartTime] = useState<string>('');
  
  const [startGeo, setStartGeo] = useState<GeoLocation | null>(null);
  const [endGeo, setEndGeo] = useState<GeoLocation | null>(null);
  const [calculatedLength, setCalculatedLength] = useState<number>(0);
  const [photo, setPhoto] = useState('');

  // Auto-Save Logic
  const autoSaveKey = initialData?.id ? `autosave_panel_${initialData.id}` : 'autosave_panel_new';
  const currentData = { category, panelNumber, rollNumber, widthFt, materialType, startTime, startGeo, endGeo, calculatedLength, photo };
  const { clearAutoSave } = useAutoSave(autoSaveKey, currentData);

  useEffect(() => {
    // Restore logic
    if (initialData) {
        const isPreFill = !initialData.id;
        setCategory(initialData.category || defaults.category);
        setPanelNumber(initialData.panelNumber || '');
        setRollNumber(initialData.rollNumber || '');
        setWidthFt(initialData.widthFt || defaults.widthFt);
        setMaterialType(initialData.materialType || defaults.materialType);
        setStartTime(initialData.startTime || '');
        setStartGeo(initialData.startGeo || null);
        setEndGeo(initialData.endGeo || null);
        setCalculatedLength(initialData.calculatedLengthFt || 0);
        setPhoto(initialData.photo || '');

        if (isPreFill) {
            const lastPanel = localStorage.getItem('last_panel_id'); 
            if (lastPanel) {
                const match = lastPanel.match(/(\d+)$/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    const prefix = lastPanel.slice(0, match.index);
                    setPanelNumber(`${prefix}${num + 1}`);
                }
            }
        }
    } else {
        // Check for autosave first
        const saved = localStorage.getItem(autoSaveKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCategory(parsed.category || defaults.category);
                setPanelNumber(parsed.panelNumber || '');
                setRollNumber(parsed.rollNumber || '');
                setWidthFt(parsed.widthFt || defaults.widthFt);
                setMaterialType(parsed.materialType || defaults.materialType);
                setStartTime(parsed.startTime || '');
                setStartGeo(parsed.startGeo || null);
                setEndGeo(parsed.endGeo || null);
                setCalculatedLength(parsed.calculatedLength || 0);
                setPhoto(parsed.photo || '');
                return; // Exit if restored
            } catch (e) {
                console.error("Failed to restore draft", e);
            }
        }

        const lastPanel = localStorage.getItem('last_panel_id'); 
        if (lastPanel) {
            const match = lastPanel.match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[0], 10);
                const prefix = lastPanel.slice(0, match.index);
                setPanelNumber(`${prefix}${num + 1}`);
            } else {
                setPanelNumber('');
            }
        } else {
            setPanelNumber('');
        }
        setCategory(defaults.category);
        setWidthFt(defaults.widthFt);
        setMaterialType(defaults.materialType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, autoSaveKey]);

  // Sync materialType with category
  useEffect(() => {
    if (category === 'Liner') setMaterialType('HDPE');
    else setMaterialType(category);
  }, [category]);

  const handleVoiceData = (data: any) => {
      if (data.panelNumber) setPanelNumber(data.panelNumber.toUpperCase());
      if (data.rollNumber) setRollNumber(data.rollNumber);
      if (data.widthFt) setWidthFt(Number(data.widthFt));
      if (data.materialType) setMaterialType(data.materialType.toUpperCase());
  };

  const handleReset = () => {
      clearAutoSave();
      setPanelNumber('');
      setRollNumber('');
      setStartGeo(null);
      setEndGeo(null);
      setCalculatedLength(0);
      setStartTime('');
      setPhoto('');
  };

  const handleCancel = () => {
      clearAutoSave();
      if (onCancel) onCancel();
  };

  useEffect(() => {
    if (!initialData) {
        onDefaultsChange({ widthFt, materialType, category });
    }
  }, [widthFt, materialType, category, onDefaultsChange, initialData]);

  const captureStart = async () => {
    setLoading(true);
    try {
      const geo = await getSmartPosition();
      setStartGeo(geo);
      if (!startTime) setStartTime(new Date().toISOString());
      
      if (endGeo) {
        const length = calculateDistanceFt(geo, endGeo);
        setCalculatedLength(Math.round(length));
      }
    } catch (err: any) {
      alert(err.message || "Could not get GPS. Try enabling Demo Mode if indoors.");
    } finally {
      setLoading(false);
    }
  };

  const captureEnd = async () => {
    setLoading(true);
    try {
      const geo = await getSmartPosition();
      setEndGeo(geo);
      if (startGeo) {
        const length = calculateDistanceFt(startGeo, geo);
        setCalculatedLength(Math.round(length));
      }
    } catch (err: any) {
       alert(err.message || "Could not get GPS. Try enabling Demo Mode if indoors.");
    } finally {
      setLoading(false);
    }
  };

  const simulateScan = () => {
    const batch = Math.floor(1000 + Math.random() * 9000);
    setRollNumber(batch.toString());
  };

  const handleRollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setRollNumber(val);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!panelNumber || !startGeo || !endGeo) return;

    const newPanel: PanelLog = {
      id: initialData?.id || crypto.randomUUID(),
      timestamp: initialData?.timestamp || Date.now(),
      category,
      startGeo,
      endGeo,
      panelNumber: panelNumber.toUpperCase(),
      rollNumber: rollNumber || 'N/A',
      startTime: startTime || new Date().toISOString(),
      calculatedLengthFt: calculatedLength || 0,
      widthFt: widthFt || 23,
      materialType: materialType || 'HDPE',
      photo,
    };

    localStorage.setItem('last_panel_id', panelNumber.toUpperCase());
    
    // Clear autosave before saving
    clearAutoSave();
    onSave(newPanel);
    
    if (!initialData || !initialData.id) {
        const match = panelNumber.match(/(\d+)$/);
        if (match) {
            const num = parseInt(match[0], 10);
            const prefix = panelNumber.slice(0, match.index);
            setPanelNumber(`${prefix}${num + 1}`);
        } else {
            setPanelNumber('');
        }
        setRollNumber('');
        setStartGeo(null);
        setEndGeo(null);
        setCalculatedLength(0);
        setStartTime('');
        setPhoto('');
    }
  };

  const getAccuracyLevel = (acc: number) => {
    if (acc <= 6) return { label: 'Excellent', color: 'text-emerald-700 border-emerald-200' };
    if (acc <= 15) return { label: 'Good', color: 'text-amber-700 border-amber-200' };
    if (acc <= 20) return { label: 'Fair', color: 'text-blue-700 border-blue-200' };
    return { label: 'Poor', color: 'text-red-700 border-red-200' };
  };

  const categories: MaterialCategory[] = ['Liner', 'GCL', 'Composite'];
  const demoMode = isDemoMode();

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <MagicMic logType="panel" onDataParsed={handleVoiceData} />
      
      <div className={`bg-white p-6 rounded-xl shadow-sm border ${initialData?.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
        
        {/* Category Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6 border border-slate-200">
          {categories.map(c => (
             <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  category === c 
                    ? 'bg-white shadow-sm text-black border border-slate-200' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
             >
                {c}
             </button>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-black flex items-center gap-2 mb-6">
          <Layers className="w-6 h-6 text-indigo-600" />
          {initialData?.id ? `Editing ${category}: ${initialData.panelNumber}` : `Log ${category} Installation`}
        </h2>

        {/* Configuration Row (Sticky Fields) */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 mb-6">
             <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Roll Width (ft)</label>
             <input 
               type="number"
               value={widthFt}
               onChange={e => setWidthFt(Number(e.target.value))}
               className="w-full p-2 rounded border border-slate-300 text-sm text-black bg-white"
             />
        </div>

        {/* ID Inputs */}
        <div className="grid grid-cols-2 gap-4 mb-4">
           <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Panel / ID #</label>
              <div className="relative">
                <input 
                    value={panelNumber} 
                    onChange={e => setPanelNumber(e.target.value.toUpperCase())}
                    className="w-full text-2xl font-bold p-2 pr-10 border-b-2 border-slate-200 focus:border-indigo-600 outline-none text-black bg-white uppercase" 
                    placeholder="B1"
                />
              </div>
           </div>
           <div>
              <label className="text-xs font-semibold uppercase text-slate-500 flex justify-between">
                Roll ID (4-Digit)
                <button onClick={simulateScan} className="text-indigo-600 flex items-center gap-1 text-[10px] uppercase">
                   <ScanBarcode className="w-3 h-3"/> Scan
                </button>
              </label>
              <div className="relative">
                <input 
                    value={rollNumber} 
                    onChange={handleRollChange}
                    maxLength={4}
                    className="w-full text-lg p-2 pr-10 border-b-2 border-slate-200 focus:border-indigo-600 outline-none bg-white text-black font-mono" 
                    placeholder="####"
                    inputMode="numeric"
                />
              </div>
           </div>
        </div>

        {/* Photo Section */}
        <div 
           onClick={() => !photo && fileInputRef.current?.click()}
           className={`mb-6 p-4 rounded-lg border-2 border-dashed flex items-center justify-center relative cursor-pointer hover:bg-slate-50 transition-all ${photo ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 bg-white'}`}
        >
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoCapture} />
             {photo ? (
                 <div className="relative w-full h-40">
                    <img src={photo} alt="Panel" className="w-full h-full object-contain rounded-md" />
                    <button 
                       onClick={(e) => { e.stopPropagation(); setPhoto(''); }}
                       className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-md m-1 hover:bg-red-600"
                    >
                       <X className="w-4 h-4" />
                    </button>
                 </div>
             ) : (
                 <div className="text-center">
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs font-bold text-slate-500 block">Attach Subgrade/Panel Photo</span>
                 </div>
             )}
        </div>

        {/* GPS Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Start GPS Button */}
          <div className={`p-4 rounded-lg border-2 relative overflow-hidden bg-white ${startGeo ? 'border-emerald-500' : 'border-dashed border-slate-300'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-black">Start Point</span>
              {startGeo && <CheckCircle className="w-5 h-5 text-emerald-600" />}
            </div>
            {startGeo ? (
              <div>
                <div className="flex justify-between items-end mb-2">
                    <div className="text-xs text-black font-mono">
                      {formatCoords(startGeo)}
                    </div>
                    <button 
                        onClick={captureStart}
                        className="text-xs bg-white border border-slate-300 px-2 py-1 rounded shadow-sm font-bold text-slate-600 hover:text-black flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" /> Retake
                    </button>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border w-fit ${getAccuracyLevel(startGeo.accuracy).color}`}>
                   <Signal className="w-3 h-3" />
                   {getAccuracyLevel(startGeo.accuracy).label} ({Math.round(startGeo.accuracy)}m)
                </div>
              </div>
            ) : (
              <button 
                onClick={captureStart}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4" />}
                {loading ? 'Averaging...' : (demoMode ? 'Capture Demo Start' : 'Capture Smart Start')}
              </button>
            )}
          </div>

          {/* End GPS Button */}
          <div className={`p-4 rounded-lg border-2 bg-white ${endGeo ? 'border-emerald-500' : 'border-dashed border-slate-300'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-black">End Point</span>
              {endGeo && <CheckCircle className="w-5 h-5 text-emerald-600" />}
            </div>
            {endGeo ? (
              <div>
                <div className="flex justify-between items-end mb-2">
                    <div className="text-xs text-black font-mono">
                       {formatCoords(endGeo)}
                    </div>
                    <button 
                        onClick={captureEnd}
                        className="text-xs bg-white border border-slate-300 px-2 py-1 rounded shadow-sm font-bold text-slate-600 hover:text-black flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" /> Retake
                    </button>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border w-fit ${getAccuracyLevel(endGeo.accuracy).color}`}>
                   <Signal className="w-3 h-3" />
                   {getAccuracyLevel(endGeo.accuracy).label} ({Math.round(endGeo.accuracy)}m)
                </div>
              </div>
            ) : (
              <button 
                onClick={captureEnd}
                disabled={!startGeo || loading}
                className={`w-full py-3 rounded-md flex items-center justify-center gap-2 ${!startGeo ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Square className="w-4 h-4" />}
                {loading ? 'Averaging...' : (demoMode ? 'Capture Demo End' : 'Capture Smart End')}
              </button>
            )}
          </div>
        </div>

        {/* Calculated Stats */}
        {calculatedLength > 0 && (
          <div className="bg-white border border-indigo-200 p-4 rounded-lg mb-6 flex justify-between items-center">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-50 rounded-lg">
                 <Ruler className="w-6 h-6 text-indigo-600" />
               </div>
               <div>
                  <span className="block text-xs text-indigo-600 uppercase font-bold">Calculated Length</span>
                  <span className="text-3xl font-bold text-black">{calculatedLength} ft</span>
               </div>
             </div>
             <div className="text-right">
                <span className="block text-xs text-indigo-600 uppercase font-bold">Area</span>
                <span className="text-xl font-bold text-black">{(calculatedLength * (widthFt || 23)).toLocaleString()} sqft</span>
             </div>
          </div>
        ) }

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
            disabled={!endGeo || !panelNumber}
            className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                ${(!endGeo || !panelNumber) ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
            <Save className="w-5 h-5" />
            {initialData?.id ? 'Update Panel Log' : `Save ${category} Log`}
            </button>
        </div>
      </div>
    </div>
  );
};

export default PanelLogComponent;