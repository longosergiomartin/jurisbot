import { useState, useRef, useEffect, useCallback } from "react";

const SUGGESTIONS = [
  "Despido durante licencia médica",
  "Infracciones cambiarias BCRA 2023",
  "Derecho al olvido digital CSJN",
  "Incompetencia BCRA en PLAyFT",
];

const ScalesIcon = ({ size = 28, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M4 7l8-4 8 4M4 7l4 8a4 4 0 0 1-8 0l4-8zM20 7l4 8a4 4 0 0 1-8 0l4-8z" />
    <line x1="6" y1="21" x2="18" y2="21" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

function TypingIndicator({ dark }) {
  const c = dark ? "#a78bfa" : "#6d28d9";
  return (
    <div style={{ display: "flex", gap: 5, padding: "6px 2px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: c,
          animation: "jbBounce 1.2s infinite", animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </div>
  );
}

function formatContent(text, dark) {
  if (!text) return null;
  const linkColor = dark ? "#93c5fd" : "#1d4ed8";
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      return part.split(/(https?:\/\/[^\s]+)/g).map((seg, k) =>
        /^https?:\/\//.test(seg)
          ? <a key={k} href={seg} target="_blank" rel="noopener noreferrer"
              style={{ color: linkColor, textDecoration: "underline", wordBreak: "break-all", fontWeight: 500 }}>{seg}</a>
          : seg
      );
    });
    return <div key={i} style={{ minHeight: line === "" ? 10 : undefined }}>{parts}</div>;
  });
}

function ChatMessage({ msg, dark }) {
  const isUser = msg.role === "user";
  const bubble = isUser
    ? { bg: dark ? "#6d28d9" : "#4c1d95", color: "#fff", radius: "20px 20px 4px 20px" }
    : { bg: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)", color: dark ? "#f1f5f9" : "#1e293b", radius: "4px 20px 20px 20px", border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)" };

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16, animation: "jbFadeIn 0.28s ease forwards" }}>
      {!isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0, marginRight: 10, marginTop: 2,
          background: dark ? "linear-gradient(135deg, #4c1d95, #2e1065)" : "linear-gradient(135deg, #7c3aed, #4c1d95)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 12px rgba(109,40,217,0.4)",
        }}>
          <ScalesIcon size={16} color="#fff" />
        </div>
      )}
      <div style={{
        maxWidth: "78%", padding: "11px 15px", borderRadius: bubble.radius,
        background: bubble.bg, color: bubble.color, border: bubble.border,
        fontSize: 14, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        boxShadow: isUser ? "0 4px 16px rgba(109,40,217,0.25)" : "none",
      }}>
        {msg.typing ? <TypingIndicator dark={dark} /> : formatContent(msg.content, dark)}
      </div>
    </div>
  );
}

export default function JurisBot() {
  const [dark, setDark] = useState(true);
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `¡Hola! Soy **JurisBot** 🇦🇷\n\nBuscá fallos y resoluciones reales en **SAIJ**, **CSJN** y **BCRA**. Escribís en lenguaje natural y te traigo resultados verificables con link a la fuente.\n\n⚠️ Nunca invento casos. Si no encuentro resultados reales, te lo digo.`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const send = useCallback(async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }, { role: "assistant", content: "", typing: true }]);
    setLoading(true);
    const newHistory = [...history, { role: "user", content: q }];
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newHistory }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "No pude obtener resultados. Intentá reformular la búsqueda.";
      setHistory([...newHistory, { role: "assistant", content: reply }]);
      setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: "⚠️ Error de conexión. Intentá de nuevo." }]);
    }
    setLoading(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [input, loading, history]);

  // Theme tokens
  const t = dark ? {
    bg: "#0f0a1e",
    bgGrad: "radial-gradient(ellipse at 20% 0%, #1e1040 0%, #0f0a1e 60%)",
    panel: "rgba(255,255,255,0.05)",
    panelBorder: "rgba(255,255,255,0.1)",
    header: "rgba(15,10,30,0.95)",
    headerBorder: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.06)",
    inputBorder: "rgba(255,255,255,0.12)",
    inputBorderFocus: "rgba(139,92,246,0.7)",
    inputColor: "#f1f5f9",
    placeholder: "rgba(241,245,249,0.35)",
    tagBg: "rgba(139,92,246,0.15)",
    tagBorder: "rgba(139,92,246,0.35)",
    tagColor: "#c4b5fd",
    suggestBg: "rgba(255,255,255,0.04)",
    suggestBorder: "rgba(255,255,255,0.1)",
    suggestColor: "rgba(241,245,249,0.7)",
    suggestHover: "rgba(255,255,255,0.08)",
    statusDot: "#4ade80",
    statusText: "rgba(241,245,249,0.5)",
    footerText: "rgba(241,245,249,0.25)",
    accent: "#8b5cf6",
    accentHover: "#7c3aed",
    toggleBg: "rgba(255,255,255,0.08)",
    logoColor: "#a78bfa",
    subtitleColor: "rgba(167,139,250,0.6)",
    sendDisabled: "rgba(139,92,246,0.2)",
  } : {
    bg: "#f8f7ff",
    bgGrad: "radial-gradient(ellipse at 20% 0%, #ede9fe 0%, #f8f7ff 60%)",
    panel: "#ffffff",
    panelBorder: "rgba(0,0,0,0.08)",
    header: "rgba(255,255,255,0.97)",
    headerBorder: "rgba(0,0,0,0.06)",
    inputBg: "#f1f5f9",
    inputBorder: "rgba(0,0,0,0.1)",
    inputBorderFocus: "rgba(109,40,217,0.5)",
    inputColor: "#1e293b",
    placeholder: "rgba(30,41,59,0.4)",
    tagBg: "rgba(109,40,217,0.08)",
    tagBorder: "rgba(109,40,217,0.2)",
    tagColor: "#6d28d9",
    suggestBg: "#f1f5f9",
    suggestBorder: "rgba(0,0,0,0.08)",
    suggestColor: "#4c1d95",
    suggestHover: "#ede9fe",
    statusDot: "#16a34a",
    statusText: "rgba(30,41,59,0.5)",
    footerText: "rgba(30,41,59,0.3)",
    accent: "#6d28d9",
    accentHover: "#5b21b6",
    toggleBg: "rgba(0,0,0,0.06)",
    logoColor: "#6d28d9",
    subtitleColor: "rgba(109,40,217,0.5)",
    sendDisabled: "rgba(109,40,217,0.15)",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bgGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px", transition: "background 0.4s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }
        @keyframes jbFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes jbBounce { 0%,80%,100% { transform:translateY(0); opacity:0.35; } 40% { transform:translateY(-7px); opacity:1; } }
        @keyframes jbPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        textarea { resize:none; font-family:'DM Sans',sans-serif; }
        textarea:focus { outline:none; }
        .jb-suggest:hover { background: var(--sh) !important; transform: translateY(-1px); }
        .jb-toggle:hover { opacity: 0.8; }
        .jb-send:hover:not(:disabled) { filter: brightness(1.15); transform: scale(1.05); }
        @media (max-width: 480px) {
          .jb-header-title { font-size: 22px !important; }
          .jb-tags { display: none !important; }
          .jb-subtitle { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 640, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: `linear-gradient(135deg, ${t.accent}, ${dark ? "#4c1d95" : "#6d28d9"})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 20px ${t.accent}55`,
          }}>
            <ScalesIcon size={20} color="#fff" />
          </div>
          <div>
            <div className="jb-header-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: t.logoColor, letterSpacing: "-0.5px", lineHeight: 1 }}>
              JurisBot
            </div>
            <div className="jb-subtitle" style={{ fontSize: 11, color: t.subtitleColor, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, letterSpacing: "0.5px", marginTop: 2 }}>
              JURISPRUDENCIA ARGENTINA VERIFICADA
            </div>
          </div>
        </div>
        <button
          className="jb-toggle"
          onClick={() => setDark(d => !d)}
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
            background: t.toggleBg, color: dark ? "#fbbf24" : "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s",
          }}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {/* Chat panel */}
      <div style={{
        width: "100%", maxWidth: 640,
        height: "min(68vh, 580px)",
        background: t.panel,
        border: `1px solid ${t.panelBorder}`,
        borderRadius: 24,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: dark
          ? "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 20px 60px rgba(109,40,217,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        transition: "background 0.4s, border-color 0.4s, box-shadow 0.4s",
      }}>

        {/* Status bar */}
        <div style={{
          padding: "10px 18px", borderBottom: `1px solid ${t.headerBorder}`,
          display: "flex", alignItems: "center", gap: 8,
          background: t.header, backdropFilter: "blur(12px)",
          transition: "all 0.4s",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.statusDot, boxShadow: `0 0 8px ${t.statusDot}`, animation: "jbPulse 2s infinite" }} />
          <span style={{ color: t.statusText, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
            Activo · Fuentes oficiales verificadas
          </span>
          <div className="jb-tags" style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {["SAIJ", "CSJN", "BCRA"].map(s => (
              <span key={s} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                background: t.tagBg, border: `1px solid ${t.tagBorder}`, color: t.tagColor,
                fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.3px",
                transition: "all 0.4s",
              }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
          {messages.map((m, i) => <ChatMessage key={i} msg={m} dark={dark} />)}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={{ padding: "0 16px 12px", display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SUGGESTIONS.map((q, i) => (
              <button
                key={i}
                className="jb-suggest"
                onClick={() => send(q)}
                style={{
                  "--sh": t.suggestHover,
                  padding: "6px 13px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${t.suggestBorder}`, background: t.suggestBg,
                  color: t.suggestColor, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500, transition: "all 0.2s",
                }}
              >{q}</button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={{
          padding: "12px 14px", borderTop: `1px solid ${t.headerBorder}`,
          display: "flex", gap: 10, alignItems: "flex-end",
          background: t.header, transition: "all 0.4s",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Escribí tu búsqueda en lenguaje natural..."
            rows={1}
            style={{
              flex: 1, background: t.inputBg, color: t.inputColor,
              border: `1.5px solid ${t.inputBorder}`, borderRadius: 14,
              padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
              maxHeight: 120, overflowY: "auto", transition: "all 0.3s",
            }}
            onFocus={e => e.target.style.borderColor = t.inputBorderFocus}
            onBlur={e => e.target.style.borderColor = t.inputBorder}
          />
          <button
            className="jb-send"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: 14, border: "none", flexShrink: 0,
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              background: input.trim() && !loading ? t.accent : t.sendDisabled,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", boxShadow: input.trim() && !loading ? `0 4px 14px ${t.accent}55` : "none",
            }}
          >
            {loading
              ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : <SendIcon />}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 14, color: t.footerText, fontSize: 11, textAlign: "center", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.9, transition: "color 0.4s" }}>
        Resultados exclusivamente de fuentes oficiales · Nunca se generan fallos ficticios<br />
        <span style={{ opacity: 0.7 }}>Presioná Enter para enviar · Shift+Enter para nueva línea</span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
