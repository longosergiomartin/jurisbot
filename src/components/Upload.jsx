import { useState, useRef, useEffect } from 'react'

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function deriveTitle(text, fileName, urlValue) {
  if (text.trim()) {
    const firstLine = text.trim().split('\n').find(l => l.trim().length > 3)
    return firstLine ? firstLine.trim().slice(0, 55) : ''
  }
  if (fileName) {
    return fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
  }
  if (urlValue.trim()) {
    try { return new URL(urlValue.trim()).hostname.replace(/^www\./, '') } catch { return '' }
  }
  return ''
}

const TEXT_MIN = 200
const TEXT_MAX = 20000

const INPUT_TABS = [
  { id: 'text', label: '✏️ Texto' },
  { id: 'file', label: '📎 Archivo' },
  { id: 'url',  label: '🔗 URL' },
]

export default function Upload({ onReady, onBack }) {
  const [inputMode, setInputMode] = useState('text')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileData, setFileData] = useState(null)
  const [urlValue, setUrlValue] = useState('')
  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Advanced options (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [cardCount, setCardCount] = useState(15)
  const [hasGoal, setHasGoal] = useState(false)
  const [targetDate, setTargetDate] = useState('')
  const [chapterInfo, setChapterInfo] = useState({ enabled: false, current: '', total: '' })
  const fileRef = useRef()

  // Auto-derive title unless the user has manually set it
  useEffect(() => {
    if (titleTouched) return
    setTitle(deriveTitle(text, fileName, urlValue))
  }, [text, fileName, urlValue, titleTouched])

  function getFileMeta(file) {
    const n = file.name.toLowerCase()
    if (file.type === 'application/pdf' || n.endsWith('.pdf'))
      return { mimeType: 'application/pdf', icon: '📄', ext: /\.pdf$/i }
    if (file.type.includes('wordprocessingml') || n.endsWith('.docx'))
      return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', icon: '📝', ext: /\.docx$/i }
    if (n.match(/\.(jpg|jpeg)$/)) return { mimeType: 'image/jpeg', icon: '🖼️', ext: /\.(jpg|jpeg)$/i }
    if (n.endsWith('.png'))  return { mimeType: 'image/png',  icon: '🖼️', ext: /\.png$/i }
    if (n.endsWith('.webp')) return { mimeType: 'image/webp', icon: '🖼️', ext: /\.webp$/i }
    return null
  }

  function handleFile(file) {
    if (!file) return
    const meta = getFileMeta(file)
    if (!meta) { alert('Solo se aceptan PDF, Word (.docx) o imágenes (jpg, png, webp).'); return }
    if (file.size > 3 * 1024 * 1024) { alert('El archivo no puede superar 3 MB.'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const base64 = e.target.result.split(',')[1]
      setFileData({ base64, name: file.name, mimeType: meta.mimeType, icon: meta.icon })
      setFileName(file.name)
      setInputMode('file')
    }
    reader.readAsDataURL(file)
  }

  function handleGenerate() {
    const activeText = inputMode === 'text' ? text.trim() : null
    const activeFile = inputMode === 'file' ? fileData : null
    const activeUrl  = inputMode === 'url'  ? urlValue.trim() : null
    if (!activeText && !activeFile && !activeUrl) return
    if (activeUrl && !activeUrl.startsWith('http')) {
      alert('La URL debe empezar con http:// o https://')
      return
    }
    const finalTitle = title.trim() || deriveTitle(text, fileName, urlValue) || 'Sin título'
    onReady({
      text: activeText || null,
      fileData: activeFile || null,
      url: activeUrl || null,
      title: finalTitle,
      cardCount,
      goal: hasGoal && targetDate ? { targetDate, setAt: new Date().toISOString() } : null,
      chapter: chapterInfo.enabled && chapterInfo.current && chapterInfo.total
        ? { current: Number(chapterInfo.current), total: Number(chapterInfo.total) }
        : null,
    })
  }

  const textLen = text.length
  const textError = inputMode === 'text'
    ? textLen > 0 && textLen < TEXT_MIN
      ? `Mínimo ${TEXT_MIN} caracteres (faltan ${TEXT_MIN - textLen})`
      : textLen > TEXT_MAX
        ? `Límite de ${TEXT_MAX.toLocaleString()} caracteres superado`
        : null
    : null

  const hasContent =
    (inputMode === 'text' && textLen >= TEXT_MIN && textLen <= TEXT_MAX) ||
    (inputMode === 'file' && !!fileData) ||
    (inputMode === 'url'  && urlValue.trim().length > 0)

  const titleIsAuto = !titleTouched && title.length > 0

  return (
    <div className="screen">
      <div className="container animate-fade" style={{ paddingTop: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, padding: 4, lineHeight: 1 }}>←</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Nuevo mazo</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Kuma generará las tarjetas por vos</p>
          </div>
        </div>

        {/* Input mode tabs */}
        <div style={{
          display: 'flex', gap: 3, marginBottom: 12,
          background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 3,
        }}>
          {INPUT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setInputMode(tab.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: inputMode === tab.id ? 'var(--primary)' : 'transparent',
                color: inputMode === tab.id ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.18s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Texto ── */}
        {inputMode === 'text' && (
          <div style={{ marginBottom: 14 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Pegá tus apuntes, un capítulo, cualquier texto..."
              rows={8}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid var(--border)',
                borderRadius: 14,
                padding: '14px',
                fontSize: 14,
                lineHeight: 1.7,
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
                color: 'var(--text)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {textLen > 0 && (
              <div style={{
                fontSize: 12, marginTop: 5,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: textError ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {textError || ''}
                </span>
                <span style={{
                  color: textLen > TEXT_MAX ? 'var(--danger)' : textLen < TEXT_MIN ? 'var(--text-muted)' : 'var(--success)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {textLen.toLocaleString()} / {TEXT_MAX.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Archivo ── */}
        {inputMode === 'file' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => !fileData && fileRef.current?.click()}
            style={{
              border: `2px dashed ${fileData ? 'var(--success)' : dragging ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 14,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: fileData ? 'default' : 'pointer',
              background: fileData ? 'var(--success-dim)' : dragging ? 'var(--primary-dim)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
              marginBottom: 14,
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {fileData ? (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{fileData.icon}</div>
                <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 14, marginBottom: 4 }}>{fileName}</div>
                <button
                  onClick={e => { e.stopPropagation(); setFileData(null); setFileName(''); setTitleTouched(false) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Subir archivo</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Arrastrá aquí o hacé click · PDF, .docx, jpg, png, webp · Máx 10 MB</div>
              </div>
            )}
          </div>
        )}

        {/* ── URL ── */}
        {inputMode === 'url' && (
          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
              placeholder="https://..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid var(--border)',
                borderRadius: 12,
                padding: '13px 14px',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
                color: 'var(--text)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        )}

        {/* Title — always visible, auto-suggested */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>
              Nombre del mazo
            </label>
            {titleIsAuto && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--primary-light)',
                background: 'var(--primary-dim)', borderRadius: 4, padding: '1px 5px',
                letterSpacing: '0.3px',
              }}>
                AUTO
              </span>
            )}
          </div>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setTitleTouched(true) }}
            placeholder="Ej: Anatomía Cap. 3, Python Basics..."
            maxLength={60}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid var(--border)',
              borderRadius: 12,
              padding: '11px 14px',
              fontSize: 15,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Advanced options accordion */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: showAdvanced ? 0 : 16,
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Opciones avanzadas
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: showAdvanced ? 'rotate(180deg)' : 'none' }}>
            ⌄
          </span>
        </button>

        {showAdvanced && (
          <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px', marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>

            {/* Card count */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Cantidad de tarjetas</span>
                <span style={{ color: 'var(--primary-light)' }}>{cardCount}</span>
              </label>
              <input
                type="range" min={5} max={30} step={5} value={cardCount}
                onChange={e => setCardCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>5 (rápido)</span><span>30 (completo)</span>
              </div>
            </div>

            {/* Chapter toggle */}
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => setChapterInfo(v => ({ ...v, enabled: !v.enabled }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: chapterInfo.enabled ? 'var(--teal-dim)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${chapterInfo.enabled ? 'rgba(34,211,238,0.35)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📖</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: chapterInfo.enabled ? 'var(--teal)' : 'var(--text-soft)' }}>
                      Es parte de un curso/libro
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Seguí tu progreso capítulo a capítulo</div>
                  </div>
                </div>
                <Toggle on={chapterInfo.enabled} color="var(--teal)" />
              </button>
              {chapterInfo.enabled && (
                <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {['current', 'total'].map(field => (
                      <div key={field}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 }}>
                          {field === 'current' ? 'Capítulo actual' : 'Total de capítulos'}
                        </label>
                        <input
                          type="number" min={1} placeholder={field === 'current' ? '3' : '10'}
                          value={chapterInfo[field]}
                          onChange={e => setChapterInfo(v => ({ ...v, [field]: e.target.value }))}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: 'var(--text)' }}
                          onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Goal/deadline toggle */}
            <div>
              <button
                onClick={() => setHasGoal(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: hasGoal ? 'var(--accent-dim)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${hasGoal ? 'rgba(251,191,36,0.35)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: hasGoal ? 'var(--accent)' : 'var(--text-soft)' }}>
                      Agregar fecha límite
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kuma te ayuda a llegar a tiempo</div>
                  </div>
                </div>
                <Toggle on={hasGoal} color="var(--accent)" />
              </button>
              {hasGoal && (
                <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 6 }}>
                    ¿Para cuándo querés dominarlo?
                  </label>
                  <input
                    type="date" value={targetDate} min={getTodayStr()}
                    onChange={e => setTargetDate(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: 'var(--text)', colorScheme: 'dark' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              )}
            </div>

          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={!hasContent}
          style={{ width: '100%', padding: '15px', fontSize: 16 }}
        >
          ✨ Generar {cardCount} tarjetas
        </button>

      </div>
    </div>
  )
}

// Reusable toggle knob (used in advanced options)
function Toggle({ on, color }) {
  return (
    <div style={{
      width: 38, height: 21, borderRadius: 11,
      background: on ? color : 'rgba(255,255,255,0.1)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 15, height: 15, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: on ? 20 : 3, transition: 'left 0.2s',
      }} />
    </div>
  )
}
