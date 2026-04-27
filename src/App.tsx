import { useEffect, useMemo, useState } from 'react'
import { CloudBackupPanel } from './components/CloudBackupPanel'
import { schedulePush } from './services/syncService'
import {
  RECORD_TYPES,
  calculateAirTestResult,
  createAirTestRecord,
  createDailyAsBuiltRecord,
  createDestructiveTestRecord,
  createPanelPlacementRecord,
  createRollInventoryRecord,
  createVacuumTestRecord,
  createWedgeWeldingRecord,
  createWeldTestRecord,
} from './lib/LinerSyncDataModel'
import {
  ACTIVE_QC_FORMS,
  QC_FORM_REGISTRY,
  type QCField,
  type QCFormDefinition,
  validateRequiredFields,
} from './lib/QCFormRegistry'
import {
  applyAutoFillToRecord,
  loadAutoFillMemory,
  projectProfileFromMemory,
  rememberFromRecord,
  rememberProjectProfile,
  resetAutoFillMemory,
} from './lib/AutoFillMemory'

type Screen = 'home' | 'qcChooser' | 'qcForm' | 'qcList' | 'qcDetail' | 'ar'
type RecordMap = Record<string, any>
type QCRecords = Record<string, RecordMap[]>

const QC_RECORDS_KEY = 'linersync_qc_records_v5d'

function currentDateInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentTimeInput() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function createEmptyRecords(): QCRecords {
  return ACTIVE_QC_FORMS.reduce((acc, form) => {
    acc[form.recordType] = []
    return acc
  }, {} as QCRecords)
}

function createRecordForType(recordType: string): RecordMap {
  const profile = projectProfileFromMemory(loadAutoFillMemory())
  let record: RecordMap

  switch (recordType) {
    case RECORD_TYPES.ROLL_INVENTORY:
      record = createRollInventoryRecord(profile)
      break
    case RECORD_TYPES.PANEL_PLACEMENT:
      record = createPanelPlacementRecord(profile)
      record.placementDate = currentDateInput()
      break
    case RECORD_TYPES.WEDGE_WELDING:
      record = createWedgeWeldingRecord(profile)
      record.weldDate = currentDateInput()
      record.weldTime = currentTimeInput()
      break
    case RECORD_TYPES.WELD_TEST:
      record = createWeldTestRecord(profile)
      record.testDate = currentDateInput()
      record.testTime = currentTimeInput()
      break
    case RECORD_TYPES.AIR_TEST:
      record = createAirTestRecord(profile)
      record.startingTime = currentTimeInput()
      break
    case RECORD_TYPES.DESTRUCTIVE_TEST:
      record = createDestructiveTestRecord(profile)
      record.destructiveDate = currentDateInput()
      break
    case RECORD_TYPES.VACUUM_TEST:
      record = createVacuumTestRecord(profile)
      record.dateRepaired = currentDateInput()
      break
    case RECORD_TYPES.DAILY_AS_BUILT:
      record = createDailyAsBuiltRecord(profile)
      record.reportDate = currentDateInput()
      break
    case RECORD_TYPES.PROJECT_PROFILE:
    default:
      record = {
        id: crypto.randomUUID(),
        recordType: RECORD_TYPES.PROJECT_PROFILE,
        ...profile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      break
  }

  return applyAutoFillToRecord(recordType, record)
}

function calculateDerivedFields(recordType: string, record: RecordMap): RecordMap {
  const next = { ...record }

  if (recordType === RECORD_TYPES.ROLL_INVENTORY) {
    const width = Number(next.rollWidth)
    const length = Number(next.rollLength)
    if (!Number.isNaN(width) && !Number.isNaN(length) && width > 0 && length > 0) {
      next.rollSquareFootage = String(width * length)
    }
  }

  if (recordType === RECORD_TYPES.PANEL_PLACEMENT) {
    const width = Number(next.panelWidth)
    const length = Number(next.panelLength)
    if (!Number.isNaN(width) && !Number.isNaN(length) && width > 0 && length > 0) {
      next.panelSquareFootage = String(width * length)
    }
  }

  if (recordType === RECORD_TYPES.AIR_TEST) {
    return calculateAirTestResult(next as any)
  }

  return next
}

async function getGpsPoint() {
  return new Promise<{ lat: number; lng: number; accuracyFt: number | null }>((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 0, lng: 0, accuracyFt: null })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyFt: pos.coords.accuracy ? Math.round(pos.coords.accuracy * 3.28084) : null,
      }),
      () => resolve({ lat: 0, lng: 0, accuracyFt: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

function formatSummaryValue(value: any) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value || '—'
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [activeRecordType, setActiveRecordType] = useState<string>(RECORD_TYPES.PROJECT_PROFILE)
  const [records, setRecords] = useState<QCRecords>(createEmptyRecords)
  const [draft, setDraft] = useState<RecordMap>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [status, setStatus] = useState('Ready')
  const [helpOpen, setHelpOpen] = useState(false)
  const [arMode, setArMode] = useState<'panel' | 'seam' | 'repair'>('panel')

  const activeForm = QC_FORM_REGISTRY[activeRecordType] || ACTIVE_QC_FORMS[0]
  const activeRows = records[activeRecordType] || []
  const detailRecord = activeRows.find((row) => row.id === detailId) || null
  const totalSaved = useMemo(() => Object.values(records).reduce((sum, rows) => sum + rows.length, 0), [records])
  const latestProject = records[RECORD_TYPES.PROJECT_PROFILE]?.[0]

  useEffect(() => {
    try {
      const saved = localStorage.getItem(QC_RECORDS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as QCRecords
        setRecords({ ...createEmptyRecords(), ...parsed })
      }
    } catch {
      setRecords(createEmptyRecords())
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(QC_RECORDS_KEY, JSON.stringify(records))
    schedulePush()
  }, [records])

  function openFormChooser() {
    setScreen('qcChooser')
    setStatus('QC form list open')
  }

  function openForm(form: QCFormDefinition) {
    setActiveRecordType(form.recordType)
    setDraft(createRecordForType(form.recordType))
    setEditingId(null)
    setScreen('qcForm')
    setStatus(`${form.title} ready`)
  }

  function openList(form: QCFormDefinition) {
    setActiveRecordType(form.recordType)
    setDetailId(null)
    setScreen('qcList')
    setStatus(`${form.title} logs open`)
  }

  function updateDraft(fieldKey: string, value: any) {
    setDraft((prev) => calculateDerivedFields(activeRecordType, { ...prev, [fieldKey]: value }))
  }

  async function captureGps(field: QCField) {
    const gps = await getGpsPoint()
    const point = `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`

    setDraft((prev) => {
      const next = {
        ...prev,
        gpsLatitude: gps.lat,
        gpsLongitude: gps.lng,
        gpsAccuracyFt: gps.accuracyFt,
        [field.key]: point,
        updatedAt: new Date().toISOString(),
      }
      return calculateDerivedFields(activeRecordType, next)
    })

    setStatus(`GPS captured: ${point}`)
  }

  function saveRecord() {
    const finalRecord = calculateDerivedFields(activeRecordType, {
      ...draft,
      id: editingId || draft.id || crypto.randomUUID(),
      recordType: activeRecordType,
      updatedAt: new Date().toISOString(),
      _savedAt: new Date().toISOString(),
    })

    const validation = validateRequiredFields(activeRecordType, finalRecord)
    if (!validation.ok) {
      setStatus(`Missing required: ${validation.missing.join(', ')}`)
      return
    }

    if (activeRecordType === RECORD_TYPES.PROJECT_PROFILE) {
      rememberProjectProfile(finalRecord)
    } else {
      rememberFromRecord(activeRecordType, finalRecord)
    }

    setRecords((prev) => {
      const rows = [...(prev[activeRecordType] || [])]
      const existingIndex = rows.findIndex((row) => row.id === finalRecord.id)
      if (existingIndex >= 0) rows[existingIndex] = finalRecord
      else rows.unshift(finalRecord)
      return { ...prev, [activeRecordType]: rows }
    })

    setEditingId(null)
    setDraft(createRecordForType(activeRecordType))
    setStatus(`${activeForm.title} saved and memory updated`)
  }

  function editRecord(row: RecordMap) {
    setEditingId(row.id)
    setDraft({ ...row })
    setScreen('qcForm')
    setStatus(`Editing ${activeForm.title}`)
  }

  function deleteRecord(id: string) {
    setRecords((prev) => ({
      ...prev,
      [activeRecordType]: (prev[activeRecordType] || []).filter((row) => row.id !== id),
    }))
    setDetailId(null)
    setScreen('qcList')
    setStatus(`${activeForm.title} deleted`)
  }

  function clearMemory() {
    resetAutoFillMemory()
    setStatus('Auto-fill memory reset')
  }

  function renderField(field: QCField) {
    const value = draft[field.key]

    if (field.type === 'textarea') {
      return (
        <label className="field" key={field.key}>
          <span>{field.label}{field.required ? ' *' : ''}</span>
          <textarea value={value || ''} onChange={(e) => updateDraft(field.key, e.target.value)} placeholder={field.placeholder || field.label} />
        </label>
      )
    }

    if (field.type === 'select') {
      return (
        <label className="field" key={field.key}>
          <span>{field.label}{field.required ? ' *' : ''}</span>
          <select value={value || ''} onChange={(e) => updateDraft(field.key, e.target.value)}>
            <option value="">Select</option>
            {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <label className="field" key={field.key}>
          <span>{field.label}</span>
          <button className={`btn ${value ? 'primary' : ''}`} onClick={() => updateDraft(field.key, !value)}>
            {value ? 'YES' : 'NO'}
          </button>
        </label>
      )
    }

    if (field.type === 'gps') {
      return (
        <label className="field" key={field.key}>
          <span>{field.label}</span>
          <div className="grid-two">
            <input value={value || ''} onChange={(e) => updateDraft(field.key, e.target.value)} placeholder="GPS will fill here" />
            <button className="btn" onClick={() => captureGps(field)}>CAPTURE GPS</button>
          </div>
        </label>
      )
    }

    if (field.type === 'photo') {
      return (
        <label className="field" key={field.key}>
          <span>{field.label}</span>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => updateDraft(field.key, e.target.files?.[0]?.name || '')} />
          {value ? <small>{String(value)}</small> : null}
        </label>
      )
    }

    if (field.type === 'readonly') {
      return (
        <label className="field" key={field.key}>
          <span>{field.label}</span>
          <input value={formatSummaryValue(value)} readOnly />
        </label>
      )
    }

    return (
      <label className="field" key={field.key}>
        <span>{field.label}{field.required ? ' *' : ''}</span>
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
          value={value || ''}
          onChange={(e) => updateDraft(field.key, e.target.value)}
          placeholder={field.placeholder || field.label}
        />
      </label>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        {screen === 'home' && (
          <section className="panel hero">
            <div className="brand-row">
              <div className="logo"><span>LS</span></div>
              <div>
                <h1 className="title">LinerSync QC</h1>
                <p className="subtitle">Chunk 5D - live QC forms connected</p>
              </div>
            </div>
            <div className="accent-line" />
            <div className="stack">
              <button className="btn big primary" onClick={openFormChooser}>TAP TO CAPTURE QC FORM</button>
              <button className="btn big" onClick={() => openList(ACTIVE_QC_FORMS[0])}>LAST LOGS</button>
              <button className="btn big" onClick={() => setScreen('ar')}>OPEN AR VIEW</button>
            </div>
            <div className="stats">
              <div className="stat-card"><strong>Project</strong><span>{latestProject?.projectName || 'Set in Project Setup'}</span></div>
              <div className="stat-card"><strong>Total QC Logs</strong><span>{String(totalSaved)}</span></div>
            </div>
            <div className="stack" style={{ marginTop: 14 }}>
              <CloudBackupPanel />
            </div>
          </section>
        )}

        {screen === 'qcChooser' && (
          <section className="panel">
            <button className="back" onClick={() => setScreen('home')}>← BACK</button>
            <h2 className="section-title">QC FORMS</h2>
            <p className="subtitle">Every form below uses the locked Chunk 5A/5B/5C data fields.</p>
            <div className="form-stack">
              {ACTIVE_QC_FORMS.map((form) => (
                <div className="detail-box" key={form.recordType}>
                  <strong>{form.title}</strong>
                  <div className="record-meta">{(records[form.recordType] || []).length} saved</div>
                  <div className="grid-two" style={{ marginTop: 8 }}>
                    <button className="btn primary" onClick={() => openForm(form)}>{form.actionLabel}</button>
                    <button className="btn" onClick={() => openList(form)}>VIEW LOGS</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {screen === 'qcForm' && (
          <section className="panel">
            <button className="back" onClick={() => setScreen('qcChooser')}>← BACK</button>
            <div className="project-head">
              <div>
                <h2 className="section-title">{activeForm.title}</h2>
                <p className="subtitle">Auto-fill memory is active until you change the field.</p>
              </div>
              <div className="pill">{editingId ? 'Edit' : 'New'}</div>
            </div>

            <div className="form-stack">
              {activeForm.fields.map(renderField)}
              <div className="grid-two">
                <button className="btn primary" onClick={saveRecord}>{editingId ? 'UPDATE RECORD' : 'SAVE RECORD'}</button>
                <button className="btn" onClick={() => setDraft(createRecordForType(activeRecordType))}>CLEAR FORM</button>
              </div>
              <button className="btn" onClick={clearMemory}>RESET AUTO-FILL MEMORY</button>
            </div>
          </section>
        )}

        {screen === 'qcList' && (
          <section className="panel">
            <button className="back" onClick={() => setScreen('qcChooser')}>← BACK</button>
            <div className="project-head">
              <div>
                <h2 className="section-title">{activeForm.title} Logs</h2>
                <p className="subtitle">Last saved field records.</p>
              </div>
              <div className="pill">{activeRows.length} saved</div>
            </div>
            <button className="btn primary" onClick={() => openForm(activeForm)}>ADD NEW</button>
            <div className="list" style={{ marginTop: 12 }}>
              {activeRows.length === 0 && <div className="empty-box">No logs yet for this form.</div>}
              {activeRows.map((row) => (
                <button className="record-card" key={row.id} onClick={() => { setDetailId(row.id); setScreen('qcDetail') }}>
                  <strong>{formatSummaryValue(row[activeForm.primaryField])}</strong>
                  <div className="record-meta">
                    {activeForm.summaryFields.filter((f) => f !== activeForm.primaryField).map((field) => (
                      <span key={field}>{field}: {formatSummaryValue(row[field])}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === 'qcDetail' && detailRecord && (
          <section className="panel">
            <button className="back" onClick={() => setScreen('qcList')}>← BACK</button>
            <h2 className="section-title">{activeForm.title} Detail</h2>
            <div className="form-stack">
              {Object.entries(detailRecord).filter(([key]) => key !== 'id').map(([key, value]) => (
                <div className="detail-box" key={key}>
                  <strong>{key}</strong>
                  <div>{formatSummaryValue(value)}</div>
                </div>
              ))}
            </div>
            <div className="grid-two" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => editRecord(detailRecord)}>EDIT</button>
              <button className="btn danger" onClick={() => deleteRecord(detailRecord.id)}>DELETE</button>
            </div>
          </section>
        )}

        {screen === 'ar' && (
          <section className="panel arPanel">
            <button className="back" onClick={() => setScreen('home')}>← BACK</button>
            <div className="project-head">
              <div>
                <h2 className="section-title">AR FIELD VIEW</h2>
                <p className="subtitle">AR stays parked behind QC logging until forms are stable.</p>
              </div>
              <div className="pill">Foundation</div>
            </div>
            <div className="grid-two">
              <button className={`btn ${arMode === 'panel' ? 'primary' : ''}`} onClick={() => setArMode('panel')}>PANEL</button>
              <button className={`btn ${arMode === 'seam' ? 'primary' : ''}`} onClick={() => setArMode('seam')}>SEAM</button>
            </div>
            <button className={`btn ${arMode === 'repair' ? 'primary' : ''}`} onClick={() => setArMode('repair')}>REPAIR</button>
            <div className="cameraMock">
              <div className="cameraHeader">CAMERA / AR OVERLAY PLACEHOLDER</div>
              {arMode === 'panel' && <><div className="arLine centerLine"></div><div className="arLine edgeLeft"></div><div className="arLine edgeRight"></div></>}
              {arMode === 'seam' && <><div className="arLine seamLine"></div><div className="arTag seamTag">SEAM PATH</div></>}
              {arMode === 'repair' && <><div className="repairDot repair1"></div><div className="repairDot repair2"></div><div className="arTag repairTag">REPAIR MARKER MODE</div></>}
            </div>
            <div className="detail-box">
              <strong>Current truth</strong>
              <div>QC forms are active now. True camera AR anchoring comes after logs, export, and as-built data are stable.</div>
            </div>
          </section>
        )}
      </div>

      <button className="help-fab" onClick={() => setHelpOpen(true)}>HELP</button>
      {helpOpen && (
        <div className="modal-wrap" onClick={() => setHelpOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Chunk 5D Help</h3>
            <div className="detail-box">
              <strong>What changed</strong>
              <div>All locked QC forms now open from TAP TO CAPTURE QC FORM, save records, validate required fields, and remember repeated values.</div>
            </div>
            <button className="btn primary" onClick={() => setHelpOpen(false)}>CLOSE</button>
          </div>
        </div>
      )}
      <div className="status-bar">{status}</div>
    </div>
  )
}
