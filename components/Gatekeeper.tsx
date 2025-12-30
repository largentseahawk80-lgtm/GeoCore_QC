
import React, { useState, useEffect } from 'react';
import { SubgradeInspection } from '../types';
import { getCurrentPosition } from '../services/geoService';
import { getLocalWeather } from '../services/weatherService';
import MagicMic from './MagicMic';
import { useAutoSave } from '../hooks/useAutoSave';
import { ClipboardCheck, CheckCircle, XCircle, Thermometer, Wind, Edit, Save, Wand2, Loader2 } from 'lucide-react';

interface GatekeeperProps {
  currentInspection: SubgradeInspection | null;
  onSave: (inspection: SubgradeInspection) => void;
}

const Gatekeeper: React.FC<GatekeeperProps> = ({ currentInspection, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAutoFill, setLoadingAutoFill] = useState(false);
  const [formData, setFormData] = useState<Partial<SubgradeInspection>>({
    date: new Date().toISOString().split('T')[0],
    inspector: '',
    temperature: 70,
    windSpeed: 5,
    subgradeCondition: 'Dry/Smooth',
    notes: '',
  });

  // Auto-Save
  const autoSaveKey = 'autosave_gatekeeper';
  const { clearAutoSave } = useAutoSave(autoSaveKey, formData);

  useEffect(() => {
    if (currentInspection) {
      setFormData(currentInspection);
    } else {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
          try {
              setFormData(JSON.parse(saved));
              return;
          } catch(e) {}
      }
      
      const savedInspector = localStorage.getItem('last_inspector');
      if (savedInspector) {
        setFormData(prev => ({ ...prev, inspector: savedInspector }));
      }
    }
  }, [currentInspection, autoSaveKey]);

  const handleVoiceData = (data: any) => {
    setFormData(prev => ({
        ...prev,
        inspector: data.inspector ? data.inspector.toUpperCase() : prev.inspector,
        temperature: data.temperature || prev.temperature,
        windSpeed: data.windSpeed || prev.windSpeed,
        notes: data.notes ? prev.notes + " " + data.notes : prev.notes,
    }));
  };

  const handleAutoFill = async () => {
    setLoadingAutoFill(true);
    try {
      // 1. Get GPS
      const geo = await getCurrentPosition();
      // 2. Get Weather
      const weather = await getLocalWeather(geo);
      
      // 3. Update State
      setFormData(prev => ({
        ...prev,
        temperature: weather.temperature,
        windSpeed: weather.windSpeed,
        date: new Date().toISOString().split('T')[0],
        inspector: localStorage.getItem('last_inspector') || prev.inspector
      }));
    } catch (e) {
      alert("Could not auto-fill. Ensure GPS is enabled.");
    } finally {
      setLoadingAutoFill(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passed = formData.subgradeCondition === 'Dry/Smooth';
    
    const newInspection: SubgradeInspection = {
      id: currentInspection?.id || crypto.randomUUID(),
      passed,
      date: formData.date!,
      inspector: formData.inspector || 'Unknown',
      temperature: Number(formData.temperature),
      windSpeed: Number(formData.windSpeed),
      subgradeCondition: formData.subgradeCondition as any,
      notes: formData.notes || '',
    };
    
    // Save inspector for next time
    localStorage.setItem('last_inspector', newInspection.inspector);
    
    clearAutoSave();
    onSave(newInspection);
    setIsEditing(false);
  };

  const isPassed = currentInspection?.passed;

  // Show form if: 1. No inspection exists yet, OR 2. User explicitly clicked "Edit"
  const showForm = !currentInspection || isEditing;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <MagicMic logType="gatekeeper" onDataParsed={handleVoiceData} />

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            Subgrade Acceptance Log
            </h2>
            {showForm && (
                <button 
                  type="button"
                  onClick={handleAutoFill}
                  disabled={loadingAutoFill}
                  className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-indigo-50 transition-colors"
                >
                   {loadingAutoFill ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                   Auto-Fill Conditions
                </button>
            )}
        </div>
        
        <p className="text-slate-600 mb-6">
          Daily inspection to accept subgrade conditions before liner deployment.
        </p>

        {!showForm && currentInspection ? (
          <div className={`p-6 rounded-lg border-2 flex flex-col items-center text-center gap-4 bg-white ${isPassed ? 'border-emerald-500' : 'border-red-500'}`}>
             {isPassed ? <CheckCircle className="w-16 h-16 text-emerald-600" /> : <XCircle className="w-16 h-16 text-red-600" />}
             
             <div>
               <h3 className={`text-2xl font-black ${isPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                 Status: {isPassed ? 'ACCEPTED' : 'REJECTED'}
               </h3>
               <p className="text-black mt-1 font-bold text-lg">
                 {currentInspection.subgradeCondition}
               </p>
             </div>

             <div className="grid grid-cols-2 gap-8 text-left w-full max-w-xs border-t border-slate-200 pt-4 mt-2">
                <div>
                   <span className="block text-xs uppercase text-slate-500 font-bold">Weather</span>
                   <span className="block font-mono text-black font-bold">{currentInspection.temperature}°F / {currentInspection.windSpeed}mph</span>
                </div>
                <div>
                   <span className="block text-xs uppercase text-slate-500 font-bold">Inspector</span>
                   <span className="block font-mono text-black font-bold">{currentInspection.inspector}</span>
                </div>
             </div>
             
             {currentInspection.notes && (
               <div className="w-full bg-white p-3 rounded text-sm text-black italic border border-slate-300">
                 "{currentInspection.notes}"
               </div>
             )}

             <button 
               onClick={() => setIsEditing(true)}
               className="mt-4 flex items-center gap-2 text-slate-500 hover:text-black font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
             >
               <Edit className="w-4 h-4" /> Edit Inspection Details
             </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black">Date</label>
                <input 
                  type="date" 
                  required
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border bg-white text-black"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">Inspector</label>
                <div className="relative">
                    <input 
                    type="text" 
                    required
                    placeholder="Initials"
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 pr-10 border bg-white text-black uppercase"
                    value={formData.inspector}
                    onChange={e => setFormData({...formData, inspector: e.target.value.toUpperCase()})}
                    />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black flex items-center gap-1">
                  <Thermometer className="w-4 h-4"/> Temp (°F)
                </label>
                <input 
                  type="number" 
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border bg-white text-black"
                  value={formData.temperature}
                  onChange={e => setFormData({...formData, temperature: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black flex items-center gap-1">
                  <Wind className="w-4 h-4"/> Wind (mph)
                </label>
                <input 
                  type="number" 
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border bg-white text-black"
                  value={formData.windSpeed}
                  onChange={e => setFormData({...formData, windSpeed: Number(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black">Subgrade Condition</label>
              <select 
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border bg-white text-black"
                value={formData.subgradeCondition}
                onChange={e => setFormData({...formData, subgradeCondition: e.target.value as any})}
              >
                <option value="Dry/Smooth">Dry / Smooth (Pass)</option>
                <option value="Wet/Rutted">Wet / Rutted (Fail)</option>
                <option value="Needs Grading">Needs Grading (Fail)</option>
              </select>
            </div>

            <div>
               <label className="block text-sm font-medium text-black">Notes</label>
               <div className="relative">
                   <textarea 
                      className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 pr-10 border bg-white text-black uppercase"
                      rows={3}
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value.toUpperCase()})}
                   />
               </div>
            </div>

            <div className="flex gap-3 pt-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); clearAutoSave(); }}
                    className="flex-1 bg-white border border-slate-300 text-black py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg flex justify-center items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {isEditing ? 'Update Acceptance' : 'Accept Subgrade'}
                </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Gatekeeper;
