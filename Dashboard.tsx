
import React, { useState, useMemo } from 'react';
import { AppData, PanelLog, DTLog, AirTestLog, RepairLog, WelderLog, TrialWeldLog, VacuumLog, ViewState } from '../types';
import { LayoutDashboard, CheckSquare, AlertTriangle, Ruler, Layers, TestTube, Wind, Pencil, Share2, Plus, Wrench, Zap, ClipboardCheck, BoxSelect, Table, List, Plane, Trash2, Map as MapIcon, Check, Calendar, CloudSun, Eye, HelpCircle, Info, Filter, Cloud } from 'lucide-react';
import { formatCoords } from '../services/geoService';

interface DashboardProps {
  data: AppData;
  onEdit: (type: 'panel' | 'dt' | 'airTest' | 'repair' | 'welder' | 'trial' | 'vacuum', item: any) => void;
  onNavigate: (target: ViewState) => void;
  onDelete: (type: string, id: string) => void;
  onUpdateProjectName: (name: string) => void;
  onExport: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onEdit, onNavigate, onDelete, onUpdateProjectName, onExport }) => {
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'map'>('card');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(data.projectName || 'Arthur Landfill');

  const saveName = () => {
    onUpdateProjectName(tempName);
    setIsEditingName(false);
  };

  const calculateArea = (panels: PanelLog[]) => panels.reduce((acc, p) => acc + ((p.calculatedLengthFt || 0) * p.widthFt), 0);
  
  const totalArea = calculateArea(data.panels);
  const totalRepairs = data.repairs.length;
  
  // Combine all Tests
  const totalDTs = data.dts.length;
  const totalAirTests = data.airTests?.length || 0;
  const totalTrials = data.trialLogs?.length || 0;
  const totalVacuums = data.vacuumLogs?.length || 0;
  const totalTests = totalDTs + totalAirTests + totalTrials + totalVacuums;
  
  const passedDTs = data.dts.filter(d => d.passed).length;
  const passedAirTests = data.airTests?.filter(a => a.passed).length || 0;
  const passedTrials = data.trialLogs?.filter(t => t.passed).length || 0;
  const passedVacuums = data.vacuumLogs?.filter(v => v.passed).length || 0;
  const passedTests = passedDTs + passedAirTests + passedTrials + passedVacuums;

  // Combine and sort all activity
  const allActivity = useMemo(() => [
    ...data.panels.map(p => ({ ...p, rowType: 'panel' as const })),
    ...data.dts.map(d => ({ ...d, rowType: 'dt' as const })),
    ...data.airTests.map(a => ({ ...a, rowType: 'airTest' as const })),
    ...data.repairs.map(r => ({ ...r, rowType: 'repair' as const })),
    ...data.welderLogs.map(w => ({ ...w, rowType: 'welder' as const })),
    ...data.trialLogs.map(t => ({ ...t, rowType: 'trial' as const })),
    ...data.vacuumLogs.map(v => ({ ...v, rowType: 'vacuum' as const })),
  ].sort((a, b) => b.timestamp - a.timestamp), [data]);

  // Filtered Activity based on selection
  const filteredActivity = useMemo(() => {
      if (activeCategory === 'all') return allActivity;
      return allActivity.filter(item => item.rowType === activeCategory);
  }, [allActivity, activeCategory]);

  const generateReport = () => {
    const today = new Date().toLocaleDateString();
    let report = `DAILY QC REPORT - ${data.projectName || 'Project'}\n`;
    report += `Date: ${today}\n`;
    report += `Inspector: ${data.inspection?.inspector || 'N/A'}\n`;
    report += `Status: ${data.inspection?.passed ? 'APPROVED' : 'PENDING/FAILED'}\n\n`;

    report += `--- PRODUCTION ---\n`;
    report += `Total Installed: ${totalArea.toLocaleString()} sf\n`;
    report += `Repairs: ${totalRepairs}\n`;
    report += `Seams Logged: ${(data.welderLogs || []).length}\n\n`;

    report += `--- TESTING ---\n`;
    report += `DT Samples: ${passedDTs}/${totalDTs} Pass\n`;
    report += `Air Tests: ${passedAirTests}/${totalAirTests} Pass\n`;
    report += `Vacuum Tests: ${passedVacuums}/${totalVacuums} Pass\n`;
    report += `Trial Welds: ${passedTrials}/${totalTrials} Pass\n\n`;

    return report;
  };

  const handleShare = async () => {
    const reportText = generateReport();
    if (navigator.share) {
      try { await navigator.share({ title: `QC Report - ${data.projectName}`, text: reportText }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(reportText);
      alert("Report copied to clipboard!");
    }
  };

  const getTrialMetrics = (t: TrialWeldLog) => {
      const p = t.peelResults?.filter(Boolean) || [];
      const s = t.shearResults?.filter(Boolean) || [];
      const avgP = p.length ? Math.round(p.reduce((a,b)=>a+b,0)/p.length) : '-';
      const avgS = s.length ? Math.round(s.reduce((a,b)=>a+b,0)/s.length) : '-';
      return `Avg P: ${avgP} | Avg S: ${avgS}`;
  };

  const getCategoryColor = (type: string) => {
    switch(type) {
        case 'panel': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';
        case 'welder': return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200';
        case 'repair': return 'bg-orange-600 hover:bg-orange-700 shadow-orange-200';
        case 'trial': return 'bg-purple-600 hover:bg-purple-700 shadow-purple-200';
        case 'dt': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200';
        case 'airTest': return 'bg-sky-600 hover:bg-sky-700 shadow-sky-200';
        case 'vacuum': return 'bg-teal-600 hover:bg-teal-700 shadow-teal-200';
        default: return 'bg-slate-800 hover:bg-slate-900 shadow-slate-200';
    }
  };

  const getCategoryLabel = (type: string) => {
      switch(type) {
          case 'panel': return 'Panel';
          case 'welder': return 'Seam';
          case 'repair': return 'Repair';
          case 'trial': return 'Trial Weld';
          case 'dt': return 'DT Sample';
          case 'airTest': return 'Air Test';
          case 'vacuum': return 'Vacuum Test';
          default: return 'Entry';
      }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Project Info */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                   <Layers className="w-3 h-3" /> Project Name
                </div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input 
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="text-3xl font-black text-slate-900 border-b-2 border-indigo-500 outline-none bg-transparent w-full md:w-96"
                      autoFocus
                      onBlur={saveName}
                      onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    />
                    <button onClick={saveName} className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors">
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <h2 
                        onClick={() => { setTempName(data.projectName || 'Arthur Landfill'); setIsEditingName(true); }}
                        className="text-3xl font-black text-slate-900 cursor-pointer hover:text-indigo-700 transition-colors"
                    >
                        {data.projectName || 'Arthur Landfill'}
                    </h2>
                    <button 
                        onClick={() => { setTempName(data.projectName || 'Arthur Landfill'); setIsEditingName(true); }} 
                        className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    {/* NEW CLOUD SAVE BUTTON (VoiceTrigger Style) */}
                    <button 
                      onClick={onExport} 
                      className="p-1.5 rounded-full transition-all duration-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" 
                      title="Save Cloud Backup"
                    >
                       <Cloud className="w-5 h-5" />
                    </button>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                    </div>
                    {data.inspection && (
                        <>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                            <CloudSun className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold">{data.inspection.temperature}°F / {data.inspection.windSpeed}mph</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                            <span className="text-slate-400 font-bold text-xs uppercase">Insp:</span>
                            <span className="font-semibold">{data.inspection.inspector}</span>
                        </div>
                        </>
                    )}
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                 <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <button onClick={() => setViewMode('card')} className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <List className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Table className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('map')} className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <MapIcon className="w-5 h-5" />
                    </button>
                 </div>
                 <button 
                    onClick={handleShare}
                    className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all"
                 >
                    <Share2 className="w-5 h-5" /> Report
                 </button>
              </div>
          </div>

          {/* NEW FILTER SYSTEM */}
          <div className="border-t border-slate-100 pt-4 mt-4 -mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto">
              <div className="flex items-center gap-2 pb-2">
                 <FilterTab label="All" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
                 <div className="w-px bg-slate-200 mx-1 h-6 self-center shrink-0"></div>
                 <FilterTab label="Panel" active={activeCategory === 'panel'} onClick={() => setActiveCategory('panel')} color="blue" />
                 <FilterTab label="Seam" active={activeCategory === 'welder'} onClick={() => setActiveCategory('welder')} color="indigo" />
                 <FilterTab label="Repair" active={activeCategory === 'repair'} onClick={() => setActiveCategory('repair')} color="orange" />
                 <FilterTab label="Trial" active={activeCategory === 'trial'} onClick={() => setActiveCategory('trial')} color="purple" />
                 <FilterTab label="DT" active={activeCategory === 'dt'} onClick={() => setActiveCategory('dt')} color="emerald" />
                 <FilterTab label="Air" active={activeCategory === 'airTest'} onClick={() => setActiveCategory('airTest')} color="sky" />
                 <FilterTab label="Vac" active={activeCategory === 'vacuum'} onClick={() => setActiveCategory('vacuum')} color="teal" />
                 <div className="w-px bg-slate-200 mx-1 h-6 self-center shrink-0"></div>
                 <FilterTab label="Drone" active={false} onClick={() => onNavigate('drone')} color="slate" icon={<Plane className="w-3 h-3" />} />
              </div>
          </div>
      </div>

      {/* BIG ACTION BUTTON - Visible only when filtering */}
      {activeCategory !== 'all' && (
         <button
            onClick={() => onNavigate(activeCategory as ViewState)}
            className={`w-full py-5 rounded-xl text-white font-black text-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.01] active:scale-95 ${getCategoryColor(activeCategory)}`}
         >
            <Plus className="w-8 h-8" />
            Add New {getCategoryLabel(activeCategory)}
         </button>
      )}

      {/* Stats Cards - Hide when filtered to declutter */}
      {activeCategory === 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Ruler className="text-blue-600" />} label="Installed" value={`${totalArea.toLocaleString()} sf`} subValue={`${data.panels.length} Logs`} />
            <StatCard icon={<AlertTriangle className="text-orange-600" />} label="Repairs" value={totalRepairs.toString()} subValue="Active" alert={totalRepairs > 0} />
            <StatCard icon={<CheckSquare className="text-emerald-600" />} label="QC Tests" value={`${passedTests}/${totalTests}`} subValue="Pass Rate" />
            <div 
            onClick={() => onNavigate('drone')}
            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow group border-slate-200`}
            >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-sky-600" />
                <span className="text-xs font-bold uppercase text-slate-500">Drone Data</span>
                </div>
                <Pencil className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-black">
                {data.droneMedia?.length || 0} Files
            </div>
            </div>
        </div>
      )}
      
      {/* View Mode Switcher */}
      {viewMode === 'card' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white font-semibold text-black flex justify-between items-center">
                <div className="flex items-center gap-2">
                   {activeCategory !== 'all' && <Filter className="w-4 h-4 text-indigo-500" />}
                   <span>{activeCategory === 'all' ? 'Recent Activity' : `${getCategoryLabel(activeCategory)} Logs`}</span>
                </div>
                <span className="text-xs font-normal text-slate-400">
                    {filteredActivity.length} entries
                </span>
            </div>
            {filteredActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                    <p className="mb-4">No records found for this category.</p>
                    {activeCategory !== 'all' && (
                        <p className="text-xs">Tap the big button above to add one.</p>
                    )}
                </div>
            ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredActivity.map((item: any) => (
                    <div 
                        key={item.id} 
                        onClick={() => onEdit(item.rowType, item)}
                        className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors group relative"
                    >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border bg-white ${
                            item.rowType === 'panel' ? 'border-blue-200 text-blue-600' :
                            item.rowType === 'welder' ? 'border-indigo-200 text-indigo-600' :
                            item.rowType === 'trial' ? 'border-purple-200 text-purple-600' :
                            item.rowType === 'dt' ? 'border-emerald-200 text-emerald-600' :
                            item.rowType === 'repair' ? 'border-orange-200 text-orange-600' :
                            item.rowType === 'vacuum' ? 'border-teal-200 text-teal-600' :
                            'border-sky-200 text-sky-600'
                        }`}>
                            {item.rowType === 'panel' && <Layers className="w-5 h-5" />}
                            {item.rowType === 'welder' && <Zap className="w-5 h-5" />}
                            {item.rowType === 'trial' && <ClipboardCheck className="w-5 h-5" />}
                            {item.rowType === 'dt' && <TestTube className="w-5 h-5" />}
                            {item.rowType === 'airTest' && <Wind className="w-5 h-5" />}
                            {item.rowType === 'repair' && <Wrench className="w-5 h-5" />}
                            {item.rowType === 'vacuum' && <BoxSelect className="w-5 h-5" />}
                        </div>

                        <div>
                            <div className="font-bold text-black flex items-center gap-2">
                                {item.rowType === 'panel' && `Panel ${item.panelNumber}`}
                                {item.rowType === 'welder' && `Seam ${item.seamId}`}
                                {item.rowType === 'trial' && `Trial ${item.trialId}`}
                                {item.rowType === 'dt' && `DT Sample ${item.sampleId}`}
                                {item.rowType === 'airTest' && `Air Test ${item.seamId}`}
                                {item.rowType === 'repair' && `Repair ${item.repairNumber}`}
                                {item.rowType === 'vacuum' && `Vacuum ${item.logNumber}`}
                                
                                {(item.rowType === 'dt' || item.rowType === 'airTest' || item.rowType === 'trial' || item.rowType === 'vacuum') && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase border ${item.passed ? 'bg-white text-emerald-600 border-emerald-200' : 'bg-white text-red-600 border-red-200'}`}>
                                        {item.passed ? 'PASS' : 'FAIL'}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500">
                                {item.rowType === 'panel' && `${item.category} • ${item.materialType}`}
                                {item.rowType === 'welder' && `${item.type} • ${item.machineId}`}
                                {item.rowType === 'trial' && `${item.type} • Mach ${item.machineId}`}
                                {item.rowType === 'dt' && `Machine: ${item.machineId}`}
                                {item.rowType === 'airTest' && `Tech: ${item.technician}`}
                                {item.rowType === 'repair' && `${item.type}`}
                                {item.rowType === 'vacuum' && `Tech: ${item.technician}`}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(item.rowType, item.id); }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <Pencil className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                    </div>
                    </div>
                ))}
                </div>
            )}
        </div>
      ) : viewMode === 'table' ? (
        // TABLE VIEW (EXCEL MODE)
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
             <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">ID / Number</th>
                        <th className="px-4 py-3">Date/Time</th>
                        <th className="px-4 py-3">Details (Tech/Mach)</th>
                        <th className="px-4 py-3">Metrics</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredActivity.map((item: any) => (
                         <tr 
                           key={item.id} 
                           className="hover:bg-indigo-50 transition-colors"
                         >
                            <td onClick={() => onEdit(item.rowType, item)} className="px-4 py-3 font-bold text-slate-700 capitalize cursor-pointer">{item.rowType}</td>
                            <td onClick={() => onEdit(item.rowType, item)} className="px-4 py-3 font-mono font-bold text-black cursor-pointer">
                                {item.panelNumber || item.seamId || item.trialId || item.sampleId || item.repairNumber || item.logNumber}
                            </td>
                            <td onClick={() => onEdit(item.rowType, item)} className="px-4 py-3 text-slate-600 cursor-pointer">
                                {item.date || new Date(item.timestamp).toLocaleDateString()}
                            </td>
                            <td onClick={() => onEdit(item.rowType, item)} className="px-4 py-3 text-slate-600 cursor-pointer">
                                {item.technician && `Tech: ${item.technician} `}
                                {item.machineId && `Mach: ${item.machineId}`}
                                {item.inspector && `Insp: ${item.inspector}`}
                            </td>
                            <td onClick={() => onEdit(item.rowType, item)} className="px-4 py-3 text-slate-600 cursor-pointer">
                                {item.calculatedLengthFt ? `${item.calculatedLengthFt} ft` : ''}
                                {item.widthFt ? ` (${(item.calculatedLengthFt * item.widthFt).toLocaleString()} sf)` : ''}
                                {item.startPressure ? `${item.startPressure}->${item.endPressure} psi` : ''}
                                {item.rowType === 'trial' && getTrialMetrics(item)}
                            </td>
                            <td onClick={() => onEdit(item.rowType, item)} className="px-4 py-3 cursor-pointer">
                                {item.passed !== undefined ? (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.passed ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-700 bg-red-50'}`}>
                                        {item.passed ? 'PASS' : 'FAIL'}
                                    </span>
                                ) : (
                                    <span className="text-slate-400">-</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <button 
                                    onClick={() => onDelete(item.rowType, item.id)}
                                    className="text-slate-400 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                         </tr>
                    ))}
                    {filteredActivity.length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-slate-400">No records found.</td></tr>
                    )}
                </tbody>
             </table>
        </div>
      ) : (
        // MAP VIEW
        <ProjectMap data={filteredActivity} onEdit={onEdit} />
      )}
    </div>
  );
};

const FilterTab = ({ label, active, onClick, color = 'slate', icon }: any) => {
    const activeColors: any = {
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        orange: 'bg-orange-100 text-orange-700 border-orange-200',
        purple: 'bg-purple-100 text-purple-700 border-purple-200',
        emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        sky: 'bg-sky-100 text-sky-700 border-sky-200',
        teal: 'bg-teal-100 text-teal-700 border-teal-200',
        slate: 'bg-slate-800 text-white border-slate-900',
    };

    return (
        <button
           onClick={onClick}
           className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1.5
             ${active 
                ? activeColors[color] || 'bg-slate-800 text-white' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
             }
           `}
        >
            {icon}
            {label}
        </button>
    );
};

const ProjectMap = ({ data, onEdit }: { data: any[], onEdit: any }) => {
    const [style, setStyle] = useState<'blueprint' | 'satellite'>('blueprint');
    const [showInfo, setShowInfo] = useState(false);

    const mapItems = useMemo(() => {
        return data.filter(item => {
            if (item.locationGeo) return true;
            if (item.startGeo) return true;
            return false;
        });
    }, [data]);

    if (mapItems.length === 0) {
        return (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 text-slate-400">
                <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No GPS tagged logs available to map.</p>
            </div>
        );
    }

    // Calculate Bounds
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    
    mapItems.forEach(item => {
        const points = [];
        if (item.locationGeo) points.push(item.locationGeo);
        if (item.startGeo) points.push(item.startGeo);
        if (item.endGeo) points.push(item.endGeo);
        
        points.forEach(p => {
            if (p.lat < minLat) minLat = p.lat;
            if (p.lat > maxLat) maxLat = p.lat;
            if (p.lng < minLng) minLng = p.lng;
            if (p.lng > maxLng) maxLng = p.lng;
        });
    });

    // Safety check for single point or no variation
    if (minLat === maxLat) {
        minLat -= 0.0001;
        maxLat += 0.0001;
    }
    if (minLng === maxLng) {
        minLng -= 0.0001;
        maxLng += 0.0001;
    }

    // Add padding (10%)
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;
    
    // Ensure padding isn't zero
    const safeLatPad = latPadding === 0 ? 0.0001 : latPadding;
    const safeLngPad = lngPadding === 0 ? 0.0001 : lngPadding;

    minLat -= safeLatPad; maxLat += safeLatPad;
    minLng -= safeLngPad; maxLng += safeLngPad;

    const normalizeX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;
    const normalizeY = (lat: number) => 100 - ((lat - minLat) / (maxLat - minLat)) * 100;

    return (
        <div className={`rounded-xl shadow-lg border overflow-hidden relative ${style === 'satellite' ? 'bg-slate-900 border-slate-700' : 'bg-blue-600 border-blue-800'}`} style={{ aspectRatio: '16/9' }}>
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                 <button 
                   onClick={() => setStyle(s => s === 'blueprint' ? 'satellite' : 'blueprint')}
                   className="bg-black/50 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-mono hover:bg-black/70 flex items-center gap-2"
                 >
                     <Eye className="w-3 h-3" />
                     {style === 'blueprint' ? 'Blueprint' : 'Satellite'}
                 </button>
            </div>

             <div className="absolute top-4 right-4 z-10">
                 <button 
                   onClick={() => setShowInfo(!showInfo)}
                   className="bg-black/50 backdrop-blur text-white p-2 rounded-full hover:bg-black/70"
                 >
                     <Info className="w-4 h-4" />
                 </button>
                 {showInfo && (
                    <div className="absolute top-10 right-0 w-64 bg-slate-900/90 text-white p-4 rounded-xl shadow-xl backdrop-blur-md text-xs z-50">
                        <h4 className="font-bold uppercase text-slate-400 mb-2 border-b border-slate-700 pb-1">Map Legend</h4>
                        <ul className="space-y-2 mb-4">
                            <li className="flex items-center gap-2"><span className="w-3 h-1 bg-white block"></span> Panel (Liner)</li>
                            <li className="flex items-center gap-2"><span className="w-3 h-1 bg-amber-400 block"></span> Seam (Welder)</li>
                            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 block"></span> Repair / Issue</li>
                            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Passed Test</li>
                        </ul>
                        <h4 className="font-bold uppercase text-slate-400 mb-1">How it works</h4>
                        <p className="text-slate-300 leading-relaxed">
                            This map auto-scales based on your logged GPS points. It shows the relative geometry of your project without needing internet for satellite tiles.
                        </p>
                    </div>
                 )}
            </div>

            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid Lines */}
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                </pattern>
                <rect width="100" height="100" fill="url(#grid)" />

                {mapItems.map((item) => {
                    const start = item.startGeo || item.locationGeo;
                    const end = item.endGeo;
                    
                    if (!start) return null;

                    const x1 = normalizeX(start.lng);
                    const y1 = normalizeY(start.lat);
                    
                    if (end) {
                        // Draw Line (Panel or Seam)
                        const x2 = normalizeX(end.lng);
                        const y2 = normalizeY(end.lat);
                        const isPanel = item.rowType === 'panel';
                        
                        return (
                            <g key={item.id} onClick={() => onEdit(item.rowType, item)} className="cursor-pointer hover:opacity-80">
                                <line 
                                    x1={x1} y1={y1} x2={x2} y2={y2} 
                                    stroke={isPanel ? (style === 'blueprint' ? 'white' : '#3b82f6') : (style === 'blueprint' ? '#fbbf24' : '#6366f1')} 
                                    strokeWidth={isPanel ? "2" : "1"} 
                                    strokeLinecap="round"
                                    opacity="0.8"
                                />
                                {isPanel && <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r="1.5" fill="white" />}
                            </g>
                        );
                    } else {
                        // Draw Point
                        let color = '#ef4444'; // Repair default Red
                        if (item.rowType === 'dt' || item.rowType === 'airTest' || item.rowType === 'vacuum') {
                            color = item.passed ? '#10b981' : '#ef4444';
                        }
                        
                        return (
                            <g key={item.id} onClick={() => onEdit(item.rowType, item)} className="cursor-pointer hover:opacity-80">
                                <circle cx={x1} cy={y1} r="1.5" fill={color} stroke="black" strokeWidth="0.2" />
                            </g>
                        );
                    }
                })}
            </svg>
            <div className="absolute bottom-4 right-4 text-[10px] text-white/70 flex gap-4 pointer-events-none">
                <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${style === 'blueprint' ? 'bg-white' : 'bg-blue-500'}`}></span> Panel</span>
                <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${style === 'blueprint' ? 'bg-amber-400' : 'bg-indigo-500'}`}></span> Seam</span>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, subValue, alert = false }: any) => (
  <div className={`bg-white p-4 rounded-xl shadow-sm border ${alert ? 'border-red-400' : 'border-slate-200'}`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className={`text-xs font-bold uppercase ${alert ? 'text-red-600' : 'text-slate-500'}`}>{label}</span>
    </div>
    <div className={`text-2xl font-bold ${alert ? 'text-red-700' : 'text-black'}`}>{value}</div>
    <div className={`text-xs ${alert ? 'text-red-600' : 'text-slate-400'}`}>{subValue}</div>
  </div>
);

export default Dashboard;
