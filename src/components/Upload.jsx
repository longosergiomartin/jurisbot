import { useState, useRef } from 'react'

const EXAMPLES = [
  'Pega aquí tus apuntes de clase, un capítulo de libro, o cualquier texto...',
]

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Upload({ onReady, onBack }) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileData, setFileData] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [cardCount, setCardCount] = useState(15)
  const [hasGoal, setHasGoal] = useState(false)
  const [targetDate, setTargetDate] = useState('')
  const [chapterInfo, setChapterInfo] = useState({ enabled: false, current: '', total: '' })
  const fileRef = useRef()

  function getFileMeta(file) {
    const name = file.name.toLowerCase()
    if (file.type === 'application/pdf' || name.endsWith('.pdf'))
      return { mimeType: 'application/pdf', icon: '📄', ext: /\.pdf$/i }
    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    )
      return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', icon: '📝', ext: /\.docx$/i }
    return null
  }

  function handleFile(file) {
    if (!file) return
    const meta = getFileMeta(file)
    if (!meta) {
      alert('Solo se aceptan archivos PDF o Word (.docx).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no puede superar 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const base64 = e.target.result.split(',')[1]
      setFileData({ base64, name: file.name, mimeType: meta.mimeType, icon: meta.icon })
      setFileName(file.name)
      setTitle(file.name.replace(meta.ext, '').replace(/[-_]/g, ' '))
      setText('')
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleGenerate() {
    if (!text.trim() && !fileData) return
    onReady({
      text: text.trim() || null,
      fileData: fileData || null,
      title: title.trim() || 'Sin título',
      cardCount,
      goal: hasGoal && targetDate ? { targetDate, setAt: new Date().toISOString() } : null,
      chapter: chapterInfo.enabled && chapterInfo.current && chapterInfo.total
        ? { current: Number(chapterInfo.current), total: Number(chapterInfo.total) }
        : null,
    })
  }

  const hasContent = text.trim() || fileData
  const isTitleFilled = title.trim().length > 0

  return (
    <div className="screen">
      <div className="container animate-fade" style={{ paddingTop: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, padding: 4, lineHeight: 1 }}>←</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Nuevo mazo</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sube tu material y Kai generará las tarjetas</p>
          </div>
        </div>

        {/* Kai bubble */}
        <div className="kai-bubble" style={{ marginBottom: 20 }}>
          <span className="kai-avatar">🐶</span>
          <div className="kai-text">
            Pegá tus apuntes, o subí un PDF o Word (.docx). ¡Kuma se encarga de convertirlo en tarjetas listas para usar!
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 8 }}>
            Nombre del mazo
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
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

        {/* Chapter section */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setChapterInfo(v => ({ ...v, enabled: !v.enabled }))}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: chapterInfo.enabled ? 'var(--teal-dim)' : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${chapterInfo.enabled ? 'rgba(34,211,238,0.35)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📖</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: chapterInfo.enabled ? 'var(--teal)' : 'var(--text-soft)' }}>
                  Es parte de un curso/libro
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  Seguí tu progreso capítulo a capítulo
                </div>
              </div>
            </div>
            <div style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: chapterInfo.enabled ? 'var(--teal)' : 'rgba(255,255,255,0.1)',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: chapterInfo.enabled ? 21 : 3,
                transition: 'left 0.2s',
              }} />
            </div>
          </button>

          {chapterInfo.enabled && (
            <div style={{ marginTop: 10, padding: '14px 16px', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 6 }}>
                    Capítulo actual
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="3"
                    value={chapterInfo.current}
                    onChange={e => setChapterInfo(v => ({ ...v, current: e.target.value }))}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 14,
                      outline: 'none',
                      color: 'var(--text)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 6 }}>
                    Total de capítulos
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="10"
                    value={chapterInfo.total}
                    onChange={e => setChapterInfo(v => ({ ...v, total: e.target.value }))}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 14,
                      outline: 'none',
                      color: 'var(--text)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Text input */}
        {!fileData && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 8 }}>
              Pegar texto
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={EXAMPLES[0]}
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
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
              {text.length} caracteres
            </div>
          </div>
        )}

        {/* Divider */}
        {!fileData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>o</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )}

        {/* PDF drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !fileData && fileRef.current?.click()}
          style={{
            border: `2px dashed ${fileData ? 'var(--success)' : dragging ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 14,
            padding: '20px',
            textAlign: 'center',
            cursor: fileData ? 'default' : 'pointer',
            background: fileData ? 'var(--success-dim)' : dragging ? 'var(--primary-dim)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s',
            marginBottom: 20,
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {fileData ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{fileData.icon}</div>
              <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 14 }}>{fileName}</div>
              <button
                onClick={e => { e.stopPropagation(); setFileData(null); setFileName(''); setTitle('') }}
                style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Quitar archivo
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Subir PDF o Word</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Arrastrá aquí o hacé click · PDF o .docx · Máx 10 MB</div>
            </div>
          )}
        </div>

        {/* Goal section */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setHasGoal(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: hasGoal ? 'var(--accent-dim)' : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${hasGoal ? 'rgba(251,191,36,0.35)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: hasGoal ? 'var(--accent)' : 'var(--text-soft)' }}>
                  Agregar fecha límite
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  Kuma te ayuda a llegar a tiempo
                </div>
              </div>
            </div>
            <div style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: hasGoal ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: hasGoal ? 21 : 3,
                transition: 'left 0.2s',
              }} />
            </div>
          </button>

          {hasGoal && (
            <div style={{ marginTop: 10, padding: '14px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 8 }}>
                ¿Para cuándo querés dominarlo?
              </label>
              <input
                type="date"
                value={targetDate}
                min={getTodayStr()}
                onChange={e => setTargetDate(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 14,
                  outline: 'none',
                  color: 'var(--text)',
                  colorScheme: 'dark',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          )}
        </div>

        {/* Card count */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Cantidad de tarjetas</span>
            <span style={{ color: 'var(--primary-light)' }}>{cardCount}</span>
          </label>
          <input
            type="range"
            min={5}
            max={30}
            step={5}
            value={cardCount}
            onChange={e => setCardCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>5 (rápido)</span>
            <span>30 (completo)</span>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={!hasContent || !isTitleFilled}
          style={{ width: '100%', padding: '15px', fontSize: 16 }}
        >
          ✨ Generar {cardCount} tarjetas
        </button>

      </div>
    </div>
  )
}
