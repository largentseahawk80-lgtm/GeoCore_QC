import React, { useState, useEffect, useRef } from 'react';
import { ViewState, AppData, SubgradeInspection, PanelLog, DTLog, AirTestLog, RepairLog, WelderLog, TrialWeldLog, VacuumLog, MaterialCategory, DroneMedia } from './types';
import Dashboard from './components/Dashboard';
import Gatekeeper from './components/Gatekeeper';
import PanelLogComponent from './components/PanelLog';
import DTLogComponent from './components/DTLog';
import AirTestLogComponent from './components/AirTestLog';
import RepairLogComponent from './components/RepairLog';
import WelderLogComponent from './components/WelderLog';
import TrialWeldLogComponent from './components/TrialWeldLog';
import VacuumLogComponent from './components/VacuumLog';
import DroneLab from './components/DroneLab';
import Tools from './components/Tools';
import { toggleDemoMode } from './services/geoService';
import { saveProjectData, loadProjectData, getStorageUsageMB } from './services/storageService';
import { LayoutDashboard, CheckCircle, Wrench, Menu, Wand2, X, TestTube, Wind, Layers, BugPlay, Trash2, Zap, ClipboardCheck, Download, Smartphone, FileSpreadsheet, BoxSelect, Plane, Database, Cloud, Loader2, ArrowLeft, Share, Link, AlertTriangle, Globe, Rocket, Laptop, Terminal, Package, Settings, FileCode, HelpCircle, UploadCloud } from 'lucide-react';

const INITIAL_DATA: AppData = {
  projectName: 'Arthur Landfill',
  inspection: null,
  panels: [],
  repairs: [],
  dts: [],
  airTests: [],
  welderLogs: [],
  trialLogs: [],
  vacuumLogs: [],
  droneMedia: [],
};

type EditingData = 
  | { type: 'panel'; data: PanelLog | Partial<PanelLog> }
  | { type: 'dt'; data: DTLog }
  | { type: 'airTest'; data: AirTestLog }
  | { type: 'repair'; data: RepairLog | Partial<RepairLog> }
  | { type: 'welder'; data: WelderLog }
  | { type: 'trial'; data: TrialWeldLog }
  | { type: 'vacuum'; data: VacuumLog }
  | null;

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [editingData, setEditingData] = useState<EditingData>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  
  const [demoActive, setDemoActive] = useState(() => {
    return localStorage.getItem('demo_mode') === 'true';
  });

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0); // in MB
  const [isBlobUrl, setIsBlobUrl] = useState(false);
  const saveTimeoutRef = useRef<any>(null);
  
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [panelDefaults, setPanelDefaults] = useState<{
    widthFt: number;
    materialType: string;
    category: MaterialCategory;
  }>({
    widthFt: 23,
    materialType: 'HDPE',
    category: 'Liner'
  });

  // INITIAL LOAD (Migration Logic)
  useEffect(() => {
    // Check if running in a Blob URL (Preview Mode)
    setIsBlobUrl(window.location.protocol === 'blob:');

    const initApp = async () => {
        try {
            // 1. Try to load from IndexedDB (High Capacity)
            const dbData = await loadProjectData();
            
            if (dbData) {
                console.log("Loaded data from IndexedDB");
                setData(dbData);
            } else {
                // 2. Fallback: Check LocalStorage (Old Data)
                const lsData = localStorage.getItem('geoliner_data');
                if (lsData) {
                    console.log("Migrating data from LocalStorage to DB...");
                    const parsed = JSON.parse(lsData);
                    // normalize
                    if (!parsed.airTests) parsed.airTests = [];
                    if (!parsed.repairs) parsed.repairs = [];
                    if (!parsed.welderLogs) parsed.welderLogs = [];
                    if (!parsed.trialLogs) parsed.trialLogs = [];
                    if (!parsed.vacuumLogs) parsed.vacuumLogs = [];
                    if (!parsed.droneMedia) parsed.droneMedia = [];
                    if (!parsed.projectName) parsed.projectName = 'Arthur Landfill';
                    
                    setData(parsed);
                    // Save to DB immediately
                    await saveProjectData(parsed);
                    // Clear Old Storage to free space
                    localStorage.removeItem('geoliner_data');
                }
            }
        } catch (e) {
            console.error("Failed to load project data", e);
        } finally {
            setLoadingApp(false);
        }
    };
    initApp();
  }, []);

  // Calculate storage usage occasionally
  useEffect(() => {
     const checkStorage = async () => {
         const usage = await getStorageUsageMB();
         setStorageUsage(usage);
     };
     checkStorage();
     const interval = setInterval(checkStorage, 10000); // Check every 10s
     return () => clearInterval(interval);
  }, [data]);

  useEffect(() => {
    toggleDemoMode(demoActive);
  }, [demoActive]);

  // Debounced Auto-Save to IndexedDB
  useEffect(() => {
    if (loadingApp) return;

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
        saveProjectData(data).catch(err => console.error("Save failed", err));
    }, 1000); // Save 1s after last change

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, loadingApp]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        setInstallPrompt(null);
        setIsMenuOpen(false);
    } else {
        // Fallback: Show instructions for iOS or manual install
        setShowInstallHelp(true);
        setIsMenuOpen(false);
    }
  };

  const handleDemoToggle = () => {
    const newState = !demoActive;
    setDemoActive(newState);
    toggleDemoMode(newState);
    setIsMenuOpen(false);
  };

  const handleProjectNameChange = (name: string) => {
    setData(prev => ({ ...prev, projectName: name }));
  };

  const handleExportBackup = () => {
    try {
        // Use Blob to handle large files (Drone images)
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.href = url;
        downloadAnchorNode.download = `geoliner_backup_${(data.projectName || 'project').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        document.body.removeChild(downloadAnchorNode);
        URL.revokeObjectURL(url);
        
        setIsMenuOpen(false);
    } catch (e) {
        alert("Export failed. " + e);
    }
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.panels && json.dts) {
                    if (confirm(`Restore backup from ${file.name}? This will overwrite current data.`)) {
                        setData(json);
                        alert("Project data restored successfully.");
                        setIsMenuOpen(false);
                    }
                } else {
                    alert("Invalid backup file format.");
                }
            } catch (err) {
                alert("Error reading backup file.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const rows = text.split('\n');
                if (rows.length < 2) return alert("Empty CSV");
                
                const header = rows[0].toLowerCase();
                let importedCount = 0;

                if (header.includes('panel') && header.includes('length')) {
                    const newPanels: PanelLog[] = [];
                    for(let i=1; i<rows.length; i++) {
                        const cols = rows[i].split(',');
                        if (cols.length > 2) {
                            newPanels.push({
                                id: crypto.randomUUID(),
                                panelNumber: cols[0] || `IMP-${i}`,
                                rollNumber: cols[1] || 'N/A',
                                category: 'Liner',
                                startTime: new Date().toISOString(),
                                startGeo: { lat: 0, lng: 0, accuracy: 0, timestamp: 0 },
                                calculatedLengthFt: Number(cols[2]) || 0,
                                widthFt: 23,
                                materialType: 'HDPE',
                                timestamp: Date.now()
                            });
                            importedCount++;
                        }
                    }
                    setData(prev => ({ ...prev, panels: [...prev.panels, ...newPanels] }));
                } else {
                    alert("Importer currently supports Panel Logs (Column 1=ID, 2=Roll, 3=Length).");
                    return;
                }
                alert(`Successfully imported ${importedCount} records.`);
                setIsMenuOpen(false);
            } catch (err) {
                alert("Error parsing CSV.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to clear ALL project data? This cannot be undone.")) {
      setData(INITIAL_DATA);
      await saveProjectData(INITIAL_DATA);
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSaveItem = (type: string, item: any) => {
      setData(prev => {
          const listName = 
              type === 'panel' ? 'panels' :
              type === 'repair' ? 'repairs' :
              type === 'dt' ? 'dts' :
              type === 'airTest' ? 'airTests' :
              type === 'welder' ? 'welderLogs' :
              type === 'trial' ? 'trialLogs' :
              type === 'vacuum' ? 'vacuumLogs' : '';
          
          if (!listName) return prev;

          // @ts-ignore
          const list = [...prev[listName]];
          const index = list.findIndex((i: any) => i.id === item.id);
          
          if (index >= 0) {
              list[index] = item;
          } else {
              list.push(item);
          }

          return { ...prev, [listName]: list };
      });
      setView('dashboard');
      setEditingData(null);
  };

  const handleDeleteItem = (type: string, id: string) => {
      if (!confirm("Delete this log?")) return;
      setData(prev => {
          const listName = 
              type === 'panel' ? 'panels' :
              type === 'repair' ? 'repairs' :
              type === 'dt' ? 'dts' :
              type === 'airTest' ? 'airTests' :
              type === 'welder' ? 'welderLogs' :
              type === 'trial' ? 'trialLogs' :
              type === 'vacuum' ? 'vacuumLogs' : '';
          
          if (!listName) return prev;
          
          // @ts-ignore
          const list = prev[listName].filter((i: any) => i.id !== id);
          return { ...prev, [listName]: list };
      });
  };

  const handleEdit = (type: any, item: any) => {
      setEditingData({ type, data: item });
      setView(type);
  };

  const handleImportMedia = (newMedia: DroneMedia[]) => {
      setData(prev => ({ ...prev, droneMedia: [...prev.droneMedia, ...newMedia] }));
  };

  const handleDeleteMedia = (id: string) => {
      if(!confirm("Delete image?")) return;
      setData(prev => ({ ...prev, droneMedia: prev.droneMedia.filter(m => m.id !== id) }));
  };
  
  const handleDroneLogCreate = (type: 'repair' | 'panel', media: DroneMedia) => {
      if (type === 'repair') {
          setEditingData({ 
              type: 'repair', 
              data: { 
                 id: '',
                 repairNumber: '', 
                 type: 'Patch', 
                 locationGeo: media.locationGeo || { lat: 0, lng: 0, accuracy: 0, timestamp: 0 }, 
                 nearestPanelId: '', 
                 distanceFromStart: 0, 
                 size: '', 
                 technician: '', 
                 photo: media.thumbnail,
                 timestamp: Date.now()
              } as RepairLog
          });
          setView('repair');
      } else {
          setEditingData({
              type: 'panel',
              data: {
                  category: 'Liner',
                  startGeo: media.locationGeo,
              } as Partial<PanelLog>
          });
          setView('panel');
      }
  };

  if (loadingApp) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
                    <Globe className="w-6 h-6 text-indigo-500" />
                    GeoLiner<span className="text-indigo-500">QC</span>
                </h1>
            </div>
            
            <div className="flex items-center gap-3">
                {demoActive && (
                    <span className="text-[10px] font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full animate-pulse">
                        DEMO MODE
                    </span>
                )}
                {view !== 'dashboard' && (
                    <button 
                        onClick={() => { setView('dashboard'); setEditingData(null); }}
                        className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
      </nav>

      {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
              <div className="relative bg-white w-80 h-full shadow-2xl flex flex-col animate-slide-in">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h2 className="text-xl font-black text-slate-900">Menu</h2>
                      <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                          <X className="w-6 h-6 text-slate-400" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      <MenuItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" onClick={() => { setView('dashboard'); setIsMenuOpen(false); }} active={view === 'dashboard'} />
                      <MenuItem icon={<ClipboardCheck className="w-5 h-5" />} label="Subgrade Acceptance" onClick={() => { setView('gatekeeper'); setIsMenuOpen(false); }} active={view === 'gatekeeper'} />
                      <div className="my-2 border-t border-slate-100"></div>
                      <MenuItem icon={<Layers className="w-5 h-5" />} label="Panel Log" onClick={() => { setView('panel'); setIsMenuOpen(false); }} active={view === 'panel'} />
                      <MenuItem icon={<Zap className="w-5 h-5" />} label="Seam/Weld Log" onClick={() => { setView('welder'); setIsMenuOpen(false); }} active={view === 'welder'} />
                      <MenuItem icon={<Wrench className="w-5 h-5" />} label="Repair Log" onClick={() => { setView('repair'); setIsMenuOpen(false); }} active={view === 'repair'} />
                      <div className="my-2 border-t border-slate-100"></div>
                      <MenuItem icon={<TestTube className="w-5 h-5" />} label="DT Sampling" onClick={() => { setView('dt'); setIsMenuOpen(false); }} active={view === 'dt'} />
                      <MenuItem icon={<Wind className="w-5 h-5" />} label="Air Pressure Test" onClick={() => { setView('airTest'); setIsMenuOpen(false); }} active={view === 'airTest'} />
                      <MenuItem icon={<BoxSelect className="w-5 h-5" />} label="Vacuum Box Test" onClick={() => { setView('vacuum'); setIsMenuOpen(false); }} active={view === 'vacuum'} />
                      <MenuItem icon={<BugPlay className="w-5 h-5" />} label="Trial Welds" onClick={() => { setView('trial'); setIsMenuOpen(false); }} active={view === 'trial'} />
                      <div className="my-2 border-t border-slate-100"></div>
                      <MenuItem icon={<Plane className="w-5 h-5" />} label="Drone Lab" onClick={() => { setView('drone'); setIsMenuOpen(false); }} active={view === 'drone'} />
                      <MenuItem icon={<Wand2 className="w-5 h-5" />} label="AI Tools" onClick={() => { setView('tools'); setIsMenuOpen(false); }} active={view === 'tools'} />
                      
                      <div className="my-4 border-t border-slate-100 pt-4">
                          <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-2">Project Data</p>
                          <button onClick={handleExportBackup} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 text-sm font-medium text-slate-700">
                              <Download className="w-5 h-5 text-indigo-500" /> Export Backup
                          </button>
                          <button onClick={handleImportBackup} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 text-sm font-medium text-slate-700">
                              <UploadCloud className="w-5 h-5 text-indigo-500" /> Import Backup
                          </button>
                          <button onClick={handleImportCSV} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 text-sm font-medium text-slate-700">
                              <FileSpreadsheet className="w-5 h-5 text-green-600" /> Import CSV
                          </button>
                          <button onClick={handleReset} className="w-full text-left px-4 py-3 hover:bg-red-50 rounded-lg flex items-center gap-3 text-sm font-medium text-red-600">
                              <Trash2 className="w-5 h-5" /> Reset Project
                          </button>
                      </div>

                      <div className="my-4 border-t border-slate-100 pt-4">
                           <div className="flex items-center justify-between px-4 py-2">
                               <span className="text-sm font-medium text-slate-700">Demo Mode</span>
                               <button 
                                 onClick={handleDemoToggle}
                                 className={`w-12 h-6 rounded-full transition-colors relative ${demoActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                               >
                                   <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${demoActive ? 'translate-x-6' : ''}`}></div>
                               </button>
                           </div>
                           <div className="px-4 py-2 text-xs text-slate-400">
                              Simulates GPS movement and data generation for testing.
                           </div>
                      </div>

                      {installPrompt && (
                          <div className="mt-4 px-4">
                              <button onClick={handleInstallClick} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                                  <Smartphone className="w-5 h-5" /> Install App
                              </button>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
                      <div>Storage Used: {storageUsage.toFixed(2)} MB</div>
                      <div>v2.5.0 • Nano Banana</div>
                  </div>
              </div>
          </div>
      )}

      <main className="p-4 pt-6 max-w-6xl mx-auto">
        {view === 'dashboard' && (
          <Dashboard 
            data={data} 
            onEdit={handleEdit} 
            onNavigate={(v) => { setView(v); setEditingData(null); }} 
            onDelete={handleDeleteItem}
            onUpdateProjectName={handleProjectNameChange}
            onExport={handleExportBackup}
          />
        )}
        
        {view === 'gatekeeper' && (
          <Gatekeeper 
            currentInspection={data.inspection} 
            onSave={(i) => { setData(prev => ({...prev, inspection: i})); setView('dashboard'); }} 
          />
        )}

        {view === 'panel' && (
           <PanelLogComponent 
              onSave={(p) => handleSaveItem('panel', p)}
              onCancel={() => setView('dashboard')}
              defaults={panelDefaults}
              onDefaultsChange={setPanelDefaults}
              initialData={editingData?.type === 'panel' ? editingData.data as PanelLog : undefined}
           />
        )}

        {view === 'dt' && (
           <DTLogComponent 
              onSave={(d) => handleSaveItem('dt', d)}
              onCancel={() => setView('dashboard')}
              initialData={editingData?.type === 'dt' ? editingData.data as DTLog : undefined}
           />
        )}

        {view === 'airTest' && (
            <AirTestLogComponent
                onSave={(l) => handleSaveItem('airTest', l)}
                onCancel={() => setView('dashboard')}
                initialData={editingData?.type === 'airTest' ? editingData.data as AirTestLog : undefined}
            />
        )}

        {view === 'repair' && (
            <RepairLogComponent
                onSave={(r) => handleSaveItem('repair', r)}
                onCancel={() => setView('dashboard')}
                initialData={editingData?.type === 'repair' ? editingData.data as RepairLog : undefined}
                panels={data.panels}
                welderLogs={data.welderLogs}
            />
        )}

        {view === 'welder' && (
            <WelderLogComponent
                onSave={(w) => handleSaveItem('welder', w)}
                onCancel={() => setView('dashboard')}
                initialData={editingData?.type === 'welder' ? editingData.data as WelderLog : undefined}
            />
        )}

        {view === 'trial' && (
            <TrialWeldLogComponent
                onSave={(t) => handleSaveItem('trial', t)}
                onCancel={() => setView('dashboard')}
                initialData={editingData?.type === 'trial' ? editingData.data as TrialWeldLog : undefined}
            />
        )}

        {view === 'vacuum' && (
            <VacuumLogComponent
                onSave={(v) => handleSaveItem('vacuum', v)}
                onCancel={() => setView('dashboard')}
                initialData={editingData?.type === 'vacuum' ? editingData.data as VacuumLog : undefined}
            />
        )}

        {view === 'tools' && <Tools />}
        
        {view === 'drone' && (
            <DroneLab 
               media={data.droneMedia} 
               onImport={handleImportMedia} 
               onDelete={handleDeleteMedia}
               onCreateLog={handleDroneLogCreate}
            />
        )}
      </main>
      
      {showInstallHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInstallHelp(false)}></div>
              <div className="relative bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                  <Smartphone className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Install GeoLinerQC</h3>
                  <p className="text-slate-600 text-sm mb-6">
                      To install this app on your device for offline use:
                  </p>
                  <ol className="text-left text-sm text-slate-700 space-y-3 bg-slate-50 p-4 rounded-lg mb-6">
                      <li className="flex gap-2">
                          <span className="font-bold text-indigo-600">1.</span>
                          Tap the <span className="font-bold">Share</span> icon (iOS) or <span className="font-bold">Menu</span> (Android).
                      </li>
                      <li className="flex gap-2">
                          <span className="font-bold text-indigo-600">2.</span>
                          Select <span className="font-bold">"Add to Home Screen"</span>.
                      </li>
                  </ol>
                  <button onClick={() => setShowInstallHelp(false)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">
                      Got it
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon, label, onClick, active }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
    >
        <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</span>
        {label}
    </button>
);

export default App;