import React, { useState, useEffect } from 'react';
import { TrialWeldLog } from '../types';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { ClipboardCheck, Save, Trash2, Thermometer, Gauge, Clock, FileText, Activity, Grip } from 'lucide-react';

interface TrialWeldLogProps {
  onSave: (log: TrialWeldLog) => void;
  onCancel?: () => void;
  initialData?: TrialWeldLog;
}

const TrialWeldLogComponent: React.FC<TrialWeldLogProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    trialId: '',
    type: 'Wedge' as 'Wedge' | 'Extrusion',
    machineId: '',
    technician: '', // Welder
    inspector: '', // QC
    material: '',
    time: '',
    temperature: '', // Main Temp (Wedge or Barrel)
    preHeatTemp: '', // Extrusion only
    speed: '',
  });

  // Grid State
  // Wedge: 2 Rows Peel, 1 Row Shear (3 columns each)
  // Extrusion: 1 Row Peel, 1 Row Shear (3 columns each)
  const [wedgePeel1, setWedgePeel1] = useState(['', '', '']);
  const [wedgePeel2, setWedgePeel2] = useState(['', '', '']);
  const [wedgeShear, setWedgeShear] = useState(['', '', '']);

  const [extPeel, setExtPeel] = useState(['', '', '']);
  const [extShear, setExtShear] = useState(['', '', '']);

  const [isPassing, setIsPassing] = useState(true);

  // Auto-Save
  const autoSaveKey = initialData?.id ? `autosave_trial_${initialData.id}` : 'autosave_trial_new';
  
  // Flatten data for autosave
  const currentData = { 
      ...formData, 
      wedgePeel1, wedgePeel2, wedgeShear,
      extPeel, extShear,
      isPassing 
  };
  const { clearAutoSave } = useAutoSave(autoSaveKey, currentData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        trialId: initialData.trialId,
        type: initialData.type,
        machineId: initialData.machineId,
        technician: initialData.technician,
        inspector: initialData.inspector || '',
        material: initialData.material || '',
        time: initialData.time || '',
        temperature: String(initialData.temperature),
        preHeatTemp: initialData.preHeatTemp ? String(initialData.preHeatTemp) : '',
        speed: String(initialData.speed || ''),
      });

      // Hydrate Grid from saved linear arrays
      if (initialData.type === 'Wedge') {
          // Expect 6 peels (2 rows of 3) and 3 shears
          const p = [...initialData.peelResults];
          const s = [...initialData.shearResults];
          
          setWedgePeel1(p.slice(0, 3).map(String).concat(['','','']).slice(0,3));
          setWedgePeel2(p.slice(3, 6).map(String).concat(['','','']).slice(0,3));
          setWedgeShear(s.slice(0, 3).map(String).concat(['','','']).slice(0,3));
      } else {
          // Extrusion: Expect 3 peels and 3 shears
          const p = [...initialData.peelResults];
          const s = [...initialData.shearResults];
          
          setExtPeel(p.slice(0, 3).map(String).concat(['','','']).slice(0,3));
          setExtShear(s.slice(0, 3).map(String).concat(['','','']).slice(0,3));
      }
      
      setIsPassing(initialData.passed);
    } else {
        const saved = localStorage.getItem(autoSaveKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData({
                    trialId: parsed.trialId || '',
                    type: parsed.type || 'Wedge',
                    machineId: parsed.machineId || '',
                    technician: parsed.technician || '',
                    inspector: parsed.inspector || '',
                    material: parsed.material || '',
                    time: parsed.time || '',
                    temperature: parsed.temperature || '',
                    preHeatTemp: parsed.preHeatTemp || '',
                    speed: parsed.speed || '',
                });
                if (parsed.wedgePeel1) setWedgePeel1(parsed.wedgePeel1);
                if (parsed.wedgePeel2) setWedgePeel2(parsed.wedgePeel2);
                if (parsed.wedgeShear) setWedgeShear(parsed.wedgeShear);
                if (parsed.extPeel) setExtPeel(parsed.extPeel);
                if (parsed.extShear) setExtShear(parsed.extShear);
                setIsPassing(parsed.isPassing ?? true);
                return;
            } catch(e) { console.error(e); }
        }

        const savedTech = localStorage.getItem('last_trial_welder') || '';
        const savedInsp = localStorage.getItem('last_trial_qc') || '';
        const savedMachine = localStorage.getItem('last_trial_machine') || '';
        const savedMaterial = localStorage.getItem('last_trial_material') || '60 mil';
        const savedType = (localStorage.getItem('last_trial_type') as 'Wedge' | 'Extrusion') || 'Wedge';
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        setFormData(prev => ({
            ...prev,
            type: savedType,
            technician: savedTech,
            inspector: savedInsp,
            machineId: savedMachine,
            material: savedMaterial,
            time: timeString
        }));

        const lastId = localStorage.getItem('last_trial_id');
        if (lastId) {
            const match = lastId.match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[0], 10);
                const prefix = lastId.slice(0, match.index);
                setFormData(prev => ({ ...prev, trialId: `${prefix}${num + 1}` }));
            }
        }
    }
  }, [initialData, autoSaveKey]);

  const handleVoiceData = (data: any) => {
    setFormData(prev => ({
        ...prev,
        trialId: data.trialId ? data.trialId.toUpperCase() : prev.trialId,
        machineId: data.machineId ? data.machineId.toUpperCase() : prev.machineId,
        technician: data.technician ? data.technician.toUpperCase() : prev.technician,
        inspector: data.inspector ? data.inspector.toUpperCase() : prev.inspector,
        material: data.material ? data.material : prev.material,
        type: data.type || prev.type,
        temperature: data.temperature ? String(data.temperature) : prev.temperature,
        preHeatTemp: data.preHeatTemp ? String(data.preHeatTemp) : prev.preHeatTemp,
        speed: data.speed ? String(data.speed) : prev.speed,
    }));
    
    // Attempt basic fill for voice - Voice is hard to map to a 3x3 grid accurately without specific commands
    // We just fill sequentially what we find
    if (data.peelResults && Array.isArray(data.peelResults)) {
         const p = data.peelResults.map(String);
         if (formData.type === 'Wedge') {
            setWedgePeel1([p[0]||'', p[1]||'', p[2]||'']);
            setWedgePeel2([p[3]||'', p[4]||'', p[5]||'']);
         } else {
            setExtPeel([p[0]||'', p[1]||'', p[2]||'']);
         }
    }
    if (data.shearResults && Array.isArray(data.shearResults)) {
         const s = data.shearResults.map(String);
         if (formData.type === 'Wedge') {
            setWedgeShear([s[0]||'', s[1]||'', s[2]||'']);
         } else {
            setExtShear([s[0]||'', s[1]||'', s[2]||'']);
         }
    }
  };

  const handleReset = () => {
      clearAutoSave();
      setFormData(prev => ({ ...prev, trialId: '', temperature: '', preHeatTemp: '', speed: '' }));
      setWedgePeel1(['','','']);
      setWedgePeel2(['','','']);
      setWedgeShear(['','','']);
      setExtPeel(['','','']);
      setExtShear(['','','']);
      setIsPassing(true);
  };

  const handleCancel = () => {
    clearAutoSave();
    if (onCancel) onCancel();
  };

  const handleSave = () => {
    if (!formData.trialId || !formData.machineId) return;

    // Collect results
    let peels: number[] = [];
    let shears: number[] = [];

    if (formData.type === 'Wedge') {
        peels = [...wedgePeel1, ...wedgePeel2].map(Number).filter(n => !isNaN(n));
        shears = [...wedgeShear].map(Number).filter(n => !isNaN(n));
    } else {
        peels = [...extPeel].map(Number).filter(n => !isNaN(n));
        shears = [...extShear].map(Number).filter(n => !isNaN(n));
    }

    const newLog: TrialWeldLog = {
      id: initialData?.id || crypto.randomUUID(),
      trialId: formData.trialId.toUpperCase(),
      type: formData.type,
      machineId: formData.machineId.toUpperCase(),
      technician: formData.technician.toUpperCase(),
      inspector: formData.inspector.toUpperCase(),
      material: formData.material,
      time: formData.time,
      temperature: Number(formData.temperature),
      preHeatTemp: formData.preHeatTemp ? Number(formData.preHeatTemp) : undefined,
      speed: formData.speed ? Number(formData.speed) : undefined,
      peelResults: peels,
      shearResults: shears,
      passed: isPassing,
      timestamp: initialData?.timestamp || Date.now(),
    };

    localStorage.setItem('last_trial_welder', formData.technician.toUpperCase());
    localStorage.setItem('last_trial_qc', formData.inspector.toUpperCase());
    localStorage.setItem('last_trial_machine', formData.machineId.toUpperCase());
    localStorage.setItem('last_trial_material', formData.material);
    localStorage.setItem('last_trial_id', formData.trialId.toUpperCase());
    localStorage.setItem('last_trial_type', formData.type);

    clearAutoSave();
    onSave(newLog);

    if (!initialData) {
        const match = formData.trialId.match(/(\d+)$/);
        let nextId = '';
        if (match) {
            const num = parseInt(match[0], 10);
            const prefix = formData.trialId.slice(0, match.index);
            nextId = `${prefix}${num + 1}`;
        }
        setFormData(prev => ({ ...prev, trialId: nextId }));
        // Reset grids
        setWedgePeel1(['','','']);
        setWedgePeel2(['','','']);
        setWedgeShear(['','','']);
        setExtPeel(['','','']);
        setExtShear(['','','']);
        setIsPassing(true);
    }
  };

  const updateGrid = (
      setter: React.Dispatch<React.SetStateAction<string[]>>, 
      idx: number, 
      val: string
  ) => {
      setter(prev => {
          const n = [...prev];
          n[idx] = val;
          return n;
      });
  };

  const renderCell = (val: string, onChange: (v: string) => void) => (
      <input 
         type="number" 
         className="w-full text-center p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none font-mono font-bold"
         placeholder="-"
         value={val}
         onChange={e => onChange(e.target.value)}
      />
  );

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <MagicMic logType="trial" onDataParsed={handleVoiceData} />

      <div className={`bg-white p-6 rounded-xl shadow-sm border ${initialData ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
        
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-white border border-purple-200 rounded-lg">
             <ClipboardCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
             <h2 className="text-xl font-bold text-black">
               {initialData ? `Editing: ${initialData.trialId}` : 'Welding Test Record'}
             </h2>
             <p className="text-xs text-slate-500">Record Trial Weld Results</p>
          </div>
        </div>

        {/* Global Row: ID, Time, Material */}
        <div className="grid grid-cols-3 gap-3 mb-4">
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1">Trial ID</label>
              <input 
                  value={formData.trialId}
                  onChange={e => setFormData({...formData, trialId: e.target.value.toUpperCase()})}
                  placeholder="T-01"
                  className="w-full text-lg font-bold p-2 border-b-2 border-slate-200 focus:border-purple-500 outline-none bg-white text-black uppercase"
              />
           </div>
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3"/> Time
              </label>
              <input 
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                  placeholder="10:00 AM"
                  className="w-full p-2 border border-slate-300 rounded bg-white text-black"
              />
           </div>
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3"/> Material
              </label>
              <input 
                  value={formData.material}
                  onChange={e => setFormData({...formData, material: e.target.value})}
                  placeholder="60 mil"
                  className="w-full p-2 border border-slate-300 rounded bg-white text-black"
              />
           </div>
        </div>

        {/* Personel Row */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
           <div>
               <label className="text-xs font-bold uppercase text-slate-500 mb-1">QC Initials</label>
               <input 
                   value={formData.inspector}
                   onChange={e => setFormData({...formData, inspector: e.target.value.toUpperCase()})}
                   placeholder="QC"
                   className="w-full p-2 border border-slate-300 rounded bg-white text-black uppercase"
               />
           </div>
           <div>
               <label className="text-xs font-bold uppercase text-slate-500 mb-1">Welder Initials</label>
               <input 
                   value={formData.technician}
                   onChange={e => setFormData({...formData, technician: e.target.value.toUpperCase()})}
                   placeholder="WL"
                   className="w-full p-2 border border-slate-300 rounded bg-white text-black uppercase"
               />
           </div>
           <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1">Machine #</label>
              <input 
                  value={formData.machineId}
                  onChange={e => setFormData({...formData, machineId: e.target.value.toUpperCase()})}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-black uppercase"
                  placeholder="#"
              />
           </div>
        </div>

        {/* Welder Type Selector */}
        <div className="mb-6">
           <label className="text-xs font-bold uppercase text-slate-500 mb-1">Welder Type</label>
           <div className="flex gap-2">
              <button
                 type="button"
                 onClick={() => setFormData(p => ({ ...p, type: 'Wedge' }))}
                 className={`flex-1 py-3 px-1 text-sm font-bold rounded border transition-all ${formData.type === 'Wedge' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                 Wedge
              </button>
              <button
                 type="button"
                 onClick={() => setFormData(p => ({ ...p, type: 'Extrusion' }))}
                 className={`flex-1 py-3 px-1 text-sm font-bold rounded border transition-all ${formData.type === 'Extrusion' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                 Extrusion
              </button>
           </div>
        </div>

        {/* Dynamic Settings Based on Type */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            {formData.type === 'Wedge' && (
                <>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                            <Thermometer className="w-3 h-3" /> Temp
                        </label>
                        <input 
                            type="number"
                            value={formData.temperature}
                            onChange={e => setFormData({...formData, temperature: e.target.value})}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-black font-mono font-bold"
                            placeholder="750"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                            <Gauge className="w-3 h-3" /> Speed
                        </label>
                        <input 
                            type="number"
                            value={formData.speed}
                            onChange={e => setFormData({...formData, speed: e.target.value})}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-black font-mono font-bold"
                            placeholder="7.0"
                        />
                    </div>
                </>
            )}

            {formData.type === 'Extrusion' && (
                <>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                            <Thermometer className="w-3 h-3" /> Barrel Temp
                        </label>
                        <input 
                            type="number"
                            value={formData.temperature}
                            onChange={e => setFormData({...formData, temperature: e.target.value})}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-black font-mono font-bold"
                            placeholder="450"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                            <Thermometer className="w-3 h-3" /> Pre-Heat
                        </label>
                        <input 
                            type="number"
                            value={formData.preHeatTemp}
                            onChange={e => setFormData({...formData, preHeatTemp: e.target.value})}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-black font-mono font-bold"
                            placeholder="500"
                        />
                    </div>
                </>
            )}
        </div>

        {/* TEST RESULTS GRID - Column Flow for Vertical Entry */}
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto">
           <h3 className="font-bold text-black mb-3 text-sm uppercase flex items-center gap-2">
               <Grip className="w-4 h-4"/>
               {formData.type} Test Grid
           </h3>
           
           <div className={`grid gap-3 min-w-[300px] ${formData.type === 'Wedge' ? 'grid-rows-[auto_1fr_1fr_1fr]' : 'grid-rows-[auto_1fr_1fr]'} grid-flow-col`}>
                {/* Column 1: Labels */}
                <div className="flex items-center justify-center h-8"></div> {/* Spacer for Header */}
                <div className="flex items-center justify-center font-bold text-slate-700 text-sm bg-white rounded border border-slate-200">P</div>
                {formData.type === 'Wedge' && <div className="flex items-center justify-center font-bold text-slate-700 text-sm bg-white rounded border border-slate-200">P</div>}
                <div className="flex items-center justify-center font-bold text-slate-700 text-sm bg-white rounded border border-slate-200">S</div>

                {/* Data Columns (Grouped vertically in DOM so Tab order flows down) */}
                {[0, 1, 2].map(colIndex => (
                    <React.Fragment key={colIndex}>
                         <div className="text-xs font-bold text-slate-500 text-center flex items-center justify-center h-8">TEST {colIndex + 1}</div>
                         
                         {formData.type === 'Wedge' ? (
                            <>
                                {renderCell(wedgePeel1[colIndex], (v) => updateGrid(setWedgePeel1, colIndex, v))}
                                {renderCell(wedgePeel2[colIndex], (v) => updateGrid(setWedgePeel2, colIndex, v))}
                                {renderCell(wedgeShear[colIndex], (v) => updateGrid(setWedgeShear, colIndex, v))}
                            </>
                         ) : (
                            <>
                                {renderCell(extPeel[colIndex], (v) => updateGrid(setExtPeel, colIndex, v))}
                                {renderCell(extShear[colIndex], (v) => updateGrid(setExtShear, colIndex, v))}
                            </>
                         )}
                    </React.Fragment>
                ))}
           </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-300 mb-6 flex justify-between items-center">
             <span className="font-bold text-black">Final Result</span>
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
                <button onClick={handleCancel} className="flex-1 py-4 bg-white border border-slate-300 text-black rounded-xl font-bold hover:bg-slate-50">
                    Cancel
                </button>
            )}
            <button
                onClick={handleSave}
                disabled={!formData.trialId}
                className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 
                    ${!formData.trialId ? 'bg-slate-200 text-slate-400' : isPassing ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
                <Save className="w-5 h-5" />
                {initialData ? 'Update Record' : 'Save Test Record'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default TrialWeldLogComponent;