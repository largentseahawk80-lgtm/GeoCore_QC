import { useEffect, useMemo, useState } from 'react'

type Tab = 'home' | 'repairs' | 'panels' | 'rolls' | 'tests' | 'logs' | 'export'
type GpsPoint = { lat: string; lng: string; accuracy: string }
type Project = {
  id: string
  name: string
  client: string
  site: string
  pond: string
  linerType: string
  linerThickness: string
  activeRoll: string
  activePanel: string
  panelWidth: string
}
type BaseRecord = {
  id: string
  createdAt: string
  displayTime: string
  lat: string
  lng: string
  accuracy: string
  rollNo: string
  panelNo: string
  linerType: string
  linerThickness: string
}
type Repair = BaseRecord & { repairNo: string; type: 'Patch' | 'Bead'; size: string; eastATFt: string; southATFt: string; photoName: string; notes: string }
type PanelLog = BaseRecord & { panelNo: string; action: 'START' | 'STOP'; orientation: string; slope: string; width: string; length: string; notes: string }
type RollLog = BaseRecord & { rollNo: string; status: string; assignedPanel: string; width: string; length: string; notes: string }
type TestLog = BaseRecord & { testNo: string; testType: string; station: string; result: string; pressureStart: string; pressureEnd: string; durationMin: string; technician: string; notes: string }
type ActivityLog = { id: string; time: string; kind: string; title: string }
type AppData = { project: Project; repairs: Repair[]; panels: PanelLog[]; rolls: RollLog[]; tests: TestLog[]; logs: ActivityLog[] }

const STORAGE_KEY = 'linersync_s25_ultra_progress_preview_v1'

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
const clock = () => new Date().toLocaleString([], { hour12: true })
const today = () => new Date().toISOString().slice(0, 10)

function freshData(): AppData {
  return {
    project: {
      id: uid(),
      name: 'Clayton Field Project',
      client: '',
      site: '',
      pond: '',
      linerType: 'HDPE',
      linerThickness: '60 mil',
      activeRoll: '',
      activePanel: '',
      panelWidth: '23 ft',
    },
    repairs: [],
    panels: [],
    rolls: [],
    tests: [],
    logs: [],
  }
}

function csv(rows: Record<string, any>[]) {
  if (!rows.length) return 'table,message\nempty,no records yet'
  const keys = Array.from(rows.reduce((set, row) => { Object.keys(row).forEach((k) => set.add(k)); return set }, new Set<string>()))
  const esc = (v: any) => `"${String(v ?? '').replaceAll('"', '""')}"`
  return [keys.join(','), ...rows.map((row) => keys.map((key) => esc(row[key])).join(','))].join('\n')
}

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function kml(repairs: Repair[]) {
  const marks = repairs
    .filter((r) => !Number.isNaN(Number(r.lat)) && !Number.isNaN(Number(r.lng)))
    .map((r) => `<Placemark><name>${r.repairNo} ${r.type}</name><description><![CDATA[Panel: ${r.panelNo}<br/>Roll: ${r.rollNo}<br/>Size: ${r.size}<br/>East AT ft: ${r.eastATFt}<br/>South AT ft: ${r.southATFt}<br/>Notes: ${r.notes}]]></description><Point><coordinates>${r.lng},${r.lat},0</coordinates></Point></Placemark>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>LinerSync Repairs</name>${marks}</Document></kml>`
}

export default function S25UltraProgressPreview() {
  const [tab, setTab] = useState<Tab>('home')
  const [data, setData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : freshData()
    } catch {
      return freshData()
    }
  })
  const [gps, setGps] = useState<GpsPoint>({ lat: 'GPS pending', lng: 'GPS pending', accuracy: 'tap GPS' })
  const [status, setStatus] = useState('Ready on S25 Ultra preview')
  const [search, setSearch] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    refreshGps()
  }, [])

  function refreshGps() {
    if (!navigator.geolocation) {
      setStatus('GPS not available in this browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7), accuracy: `${Math.round(pos.coords.accuracy * 3.28084)} ft` })
        setStatus('GPS locked')
      },
      () => setStatus('GPS blocked. Allow location in browser settings.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const common = (): BaseRecord => ({
    id: uid(),
    createdAt: new Date().toISOString(),
    displayTime: clock(),
    lat: gps.lat,
    lng: gps.lng,
    accuracy: gps.accuracy,
    rollNo: data.project.activeRoll,
    panelNo: data.project.activePanel,
    linerType: data.project.linerType,
    linerThickness: data.project.linerThickness,
  })

  function addLog(kind: string, title: string) {
    setData((old) => ({ ...old, logs: [{ id: uid(), time: clock(), kind, title }, ...old.logs].slice(0, 300) }))
  }

  function setProject(key: keyof Project, value: string) {
    setData((old) => ({ ...old, project: { ...old.project, [key]: value } }))
  }

  function captureRepair(type: 'Patch' | 'Bead') {
    const repairNo = `R-${String(data.repairs.length + 1).padStart(3, '0')}`
    const record: Repair = { ...common(), repairNo, type, size: '', eastATFt: '', southATFt: '', photoName: '', notes: '' }
    setData((old) => ({ ...old, repairs: [record, ...old.repairs], logs: [{ id: uid(), time: clock(), kind: 'Repair', title: `${repairNo} ${type} saved` }, ...old.logs] }))
    setStatus(`${repairNo} ${type} captured`)
  }

  function startPanel() {
    const panelNo = data.project.activePanel || `P-${String(data.panels.length + 1).padStart(3, '0')}`
    const record: PanelLog = { ...common(), panelNo, action: 'START', orientation: 'E/W', slope: '', width: data.project.panelWidth, length: '', notes: '' }
    setData((old) => ({ ...old, project: { ...old.project, activePanel: panelNo }, panels: [record, ...old.panels], logs: [{ id: uid(), time: clock(), kind: 'Panel', title: `${panelNo} START` }, ...old.logs] }))
    setStatus(`${panelNo} started`)
  }

  function stopPanel() {
    const panelNo = data.project.activePanel || `P-${String(data.panels.length + 1).padStart(3, '0')}`
    const record: PanelLog = { ...common(), panelNo, action: 'STOP', orientation: 'E/W', slope: '', width: data.project.panelWidth, length: '', notes: '' }
    setData((old) => ({ ...old, panels: [record, ...old.panels], logs: [{ id: uid(), time: clock(), kind: 'Panel', title: `${panelNo} STOP` }, ...old.logs] }))
    setStatus(`${panelNo} stopped`)
  }

  function addRoll() {
    const rollNo = data.project.activeRoll.trim()
    if (!rollNo) return setStatus('Type active roll number first')
    if (data.rolls.some((r) => r.rollNo.toLowerCase() === rollNo.toLowerCase())) return setStatus(`Duplicate roll blocked: ${rollNo}`)
    const record: RollLog = { ...common(), rollNo, status: 'Active', assignedPanel: data.project.activePanel, width: data.project.panelWidth, length: '', notes: '' }
    setData((old) => ({ ...old, rolls: [record, ...old.rolls], logs: [{ id: uid(), time: clock(), kind: 'Roll', title: `${rollNo} added` }, ...old.logs] }))
    setStatus(`${rollNo} saved`)
  }

  function addTest(testType: string) {
    const testNo = `T-${String(data.tests.length + 1).padStart(3, '0')}`
    const record: TestLog = { ...common(), testNo, testType, station: '', result: 'PASS', pressureStart: '', pressureEnd: '', durationMin: testType === 'Air Test' ? '5' : '', technician: '', notes: '' }
    setData((old) => ({ ...old, tests: [record, ...old.tests], logs: [{ id: uid(), time: clock(), kind: 'Test', title: `${testNo} ${testType}` }, ...old.logs] }))
    setStatus(`${testType} saved`)
  }

  function updateRow<T extends { id: string }>(bucket: 'repairs' | 'panels' | 'rolls' | 'tests', id: string, patch: Partial<T>) {
    setData((old) => ({ ...old, [bucket]: (old[bucket] as any[]).map((row) => row.id === id ? { ...row, ...patch } : row) }))
  }

  const counts = { repairs: data.repairs.length, panels: data.panels.length, rolls: data.rolls.length, tests: data.tests.length }
  const filteredLogs = data.logs.filter((log) => `${log.kind} ${log.title}`.toLowerCase().includes(search.toLowerCase()))
  const allRows = useMemo(() => [
    ...data.repairs.map((r) => ({ table: 'repairs', ...r })),
    ...data.panels.map((r) => ({ table: 'panels', ...r })),
    ...data.rolls.map((r) => ({ table: 'rolls', ...r })),
    ...data.tests.map((r) => ({ table: 'tests', ...r })),
  ], [data])

  return (
    <div className="s25Shell">
      <div className="s25Phone">
        <header className="s25Header">
          <div>
            <div className="s25Kicker">GALAXY S25 ULTRA TAP PREVIEW</div>
            <h1>LINERSYNC QC</h1>
            <p>Repairs • Rolls • Panels • Tests • KML</p>
          </div>
          <button className="s25Gps" onClick={refreshGps}>GPS</button>
        </header>

        <section className="s25Card s25Project">
          <label>Project<input value={data.project.name} onChange={(e) => setProject('name', e.target.value)} /></label>
          <div className="s25Two">
            <label>Active Roll<input value={data.project.activeRoll} onChange={(e) => setProject('activeRoll', e.target.value)} placeholder="Roll #" /></label>
            <label>Active Panel<input value={data.project.activePanel} onChange={(e) => setProject('activePanel', e.target.value)} placeholder="P-001" /></label>
          </div>
          <div className="s25GpsLine">Lat {gps.lat} • Lng {gps.lng} • {gps.accuracy}</div>
        </section>

        <nav className="s25Nav">
          {(['home', 'repairs', 'panels', 'rolls', 'tests', 'logs', 'export'] as Tab[]).map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}
        </nav>

        {tab === 'home' && <section className="s25Grid">
          <TapCard title="Repairs" count={counts.repairs} onClick={() => setTab('repairs')} />
          <TapCard title="Panels" count={counts.panels} onClick={() => setTab('panels')} />
          <TapCard title="Rolls" count={counts.rolls} onClick={() => setTab('rolls')} />
          <TapCard title="Tests" count={counts.tests} onClick={() => setTab('tests')} />
          <button className="s25Big primary" onClick={() => captureRepair('Patch')}>TAP PATCH</button>
          <button className="s25Big primary blue" onClick={() => captureRepair('Bead')}>TAP BEAD</button>
          <button className="s25Big" onClick={startPanel}>START PANEL</button>
          <button className="s25Big" onClick={stopPanel}>STOP PANEL</button>
        </section>}

        {tab === 'repairs' && <section className="s25Card">
          <div className="s25Two"><button className="s25Big primary" onClick={() => captureRepair('Patch')}>PATCH</button><button className="s25Big primary blue" onClick={() => captureRepair('Bead')}>BEAD</button></div>
          <EditableRows rows={data.repairs} fields={['repairNo', 'type', 'panelNo', 'rollNo', 'size', 'eastATFt', 'southATFt', 'lat', 'lng', 'notes']} onChange={(id, patch) => updateRow<Repair>('repairs', id, patch)} />
        </section>}

        {tab === 'panels' && <section className="s25Card">
          <div className="s25Two"><button className="s25Big primary" onClick={startPanel}>START</button><button className="s25Big danger" onClick={stopPanel}>STOP</button></div>
          <EditableRows rows={data.panels} fields={['panelNo', 'action', 'orientation', 'slope', 'width', 'length', 'rollNo', 'lat', 'lng', 'notes']} onChange={(id, patch) => updateRow<PanelLog>('panels', id, patch)} />
        </section>}

        {tab === 'rolls' && <section className="s25Card">
          <button className="s25Big primary" onClick={addRoll}>ADD ACTIVE ROLL</button>
          <EditableRows rows={data.rolls} fields={['rollNo', 'assignedPanel', 'status', 'width', 'length', 'linerType', 'linerThickness', 'notes']} onChange={(id, patch) => updateRow<RollLog>('rolls', id, patch)} />
        </section>}

        {tab === 'tests' && <section className="s25Card">
          <div className="s25TestButtons">{['Wedge Weld', 'Extrusion', 'Air Test', 'Destructive'].map((t) => <button key={t} onClick={() => addTest(t)}>{t}</button>)}</div>
          <div className="s25Warning">Blank test fields are allowed for preview, but visible before export. Air Test defaults to 5 minutes.</div>
          <EditableRows rows={data.tests} fields={['testNo', 'testType', 'panelNo', 'rollNo', 'station', 'result', 'pressureStart', 'pressureEnd', 'durationMin', 'technician', 'notes']} onChange={(id, patch) => updateRow<TestLog>('tests', id, patch)} />
        </section>}

        {tab === 'logs' && <section className="s25Card">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs" />
          <div className="s25Logs">{filteredLogs.length === 0 ? <div className="s25Empty">No logs yet</div> : filteredLogs.map((log) => <div className="s25Log" key={log.id}><b>{log.title}</b><span>{log.kind} • {log.time}</span></div>)}</div>
        </section>}

        {tab === 'export' && <section className="s25Card">
          <button className="s25Big primary" onClick={() => download('linersync_s25_export.csv', csv(allRows), 'text/csv')}>DOWNLOAD CSV</button>
          <button className="s25Big primary blue" onClick={() => download('linersync_repairs.kml', kml(data.repairs), 'application/vnd.google-earth.kml+xml')}>DOWNLOAD KML</button>
          <button className="s25Big danger" onClick={() => { setData(freshData()); setStatus('Preview reset') }}>RESET PREVIEW</button>
        </section>}

        <footer className="s25Status">{status}</footer>
      </div>
    </div>
  )
}

function TapCard({ title, count, onClick }: { title: string; count: number; onClick: () => void }) {
  return <button className="s25TapCard" onClick={onClick}><span>{title}</span><b>{count}</b></button>
}

function EditableRows<T extends { id: string }>({ rows, fields, onChange }: { rows: T[]; fields: string[]; onChange: (id: string, patch: Partial<T>) => void }) {
  if (!rows.length) return <div className="s25Empty">No records yet. Tap a capture button.</div>
  return <div className="s25Rows">{rows.map((row: any) => <details key={row.id} open className="s25Row"><summary>{row.repairNo || row.panelNo || row.rollNo || row.testNo || 'Record'} • {row.displayTime}</summary>{fields.map((field) => <label key={field}>{field}<input value={row[field] ?? ''} onChange={(e) => onChange(row.id, { [field]: e.target.value } as Partial<T>)} /></label>)}</details>)}</div>
}
