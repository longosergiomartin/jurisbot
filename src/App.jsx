import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  "Fallos sobre despido sin causa durante licencia médica",
  "Resoluciones BCRA sobre infracciones cambiarias 2023",
  "Jurisprudencia CSJN sobre derecho al olvido digital",
  "Planteos de incompetencia BCRA en materia de PLAyFT",
];

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "4px 0", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#C9A84C",
          animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

function formatContent(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const boldParts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j} style={{ color: "#C9A84C" }}>{part.slice(2, -2)}</strong>;
      return part.split(/(https?:\/\/[^\s]+)/g).map((seg, k) =>
        /^https?:\/\//.test(seg)
          ? <a key={k} href={seg} target="_blank" rel="noopener noreferrer"
              style={{ color: "#7ec8e3", textDecoration: "underline", wordBreak: "break-all" }}>{seg}</a>
          : seg
      );
    });
    return <div key={i} style={{ minHeight: line === "" ? 8 : undefined }}>{boldParts}</div>;
  });
}

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14, animation: "fadeIn 0.3s ease forwards",
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0, marginRight: 9,
          background: "linear-gradient(135deg, #1a3a5c, #0d2136)",
          border: "1.5px solid #C9A84C", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 15,
        }}>⚖️</div>
      )}
      <div style={{
        maxWidth: "75%", padding: "10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "linear-gradient(135deg, #C9A84C, #a8872e)" : "rgba(255,255,255,0.05)",
        border: isUser ? "none" : "1px solid rgba(201,168,76,0.2)",
        color: isUser ? "#0d1b2a" : "#e8dfc8", fontSize: 14, lineHeight: 1.65,
        fontFamily: "'Lora', Georgia, serif", fontWeight: isUser ? 600 : 400,
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {msg.typing ? <TypingIndicator /> : formatContent(msg.content)}
      </div>
    </div>
  );
}

export default function JurisBot() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `¡Hola! Soy **JurisBot** 🇦🇷\n\nBuscá fallos y resoluciones reales en **SAIJ**, **CSJN** y **BCRA**. Escribís en lenguaje natural y te traigo resultados verificables con link a la fuente.\n\n⚠️ Nunca invento casos. Si no encuentro resultados reales, te lo digo directamente.`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text) {
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
      setMessages(prev => [...prev.slice(0, -1), {
        role: "assistant", content: "⚠️ Error de conexión. Intentá de nuevo.",
      }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #050d18 0%, #0d1b2a 55%, #0a1520 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "20px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Cinzel:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); opacity:0.4; } 40% { transform:translateY(-6px); opacity:1; } }
        @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        textarea { resize:none; }
        textarea:focus { outline:none; }
        .suggest-btn:hover { background: rgba(201,168,76,0.12) !important; }
        .send-btn:hover:not(:disabled) { transform: scale(1.08) !important; }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: 28, fontWeight: 700, letterSpacing: 3,
          background: "linear-gradient(90deg, #C9A84C, #f0d080, #C9A84C)",
          backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          animation: "shimmer 4s linear infinite",
        }}>JURISBOT</div>
        <div style={{ color: "rgba(201,168,76,0.55)", fontSize: 11, letterSpacing: 2, marginTop: 3 }}>
          BÚSQUEDA JUDICIAL VERIFICADA · SAIJ · CSJN · BCRA
        </div>
      </div>

      <div style={{
        width: "100%", maxWidth: 620, height: "62vh",
        background: "rgba(8,18,28,0.9)", borderRadius: 20,
        border: "1px solid rgba(201,168,76,0.22)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 28px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.07)",
      }}>
        <div style={{
          padding: "9px 18px", borderBottom: "1px solid rgba(201,168,76,0.1)",
          display: "flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.03)",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 7px #4ade80" }} />
          <span style={{ color: "rgba(232,223,200,0.6)", fontSize: 12 }}>Activo · Fuentes oficiales en tiempo real</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {["SAIJ", "CSJN", "BCRA"].map(s => (
              <span key={s} style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 20,
                border: "1px solid rgba(201,168,76,0.3)", color: "rgba(201,168,76,0.75)", fontFamily: "monospace",
              }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px" }}>
          {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTIONS.map((q, i) => (
              <button key={i} className="suggest-btn" onClick={() => send(q)} style={{
                padding: "5px 11px", borderRadius: 20, cursor: "pointer", transition: "all 0.2s",
                border: "1px solid rgba(201,168,76,0.28)", background: "transparent",
                color: "rgba(201,168,76,0.8)", fontSize: 11, fontFamily: "'Lora', serif",
              }}>{q}</button>
            ))}
          </div>
        )}

        <div style={{
          padding: "12px 14px", borderTop: "1px solid rgba(201,168,76,0.1)",
          display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(201,168,76,0.02)",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Escribí tu búsqueda en lenguaje natural..."
            rows={1}
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", color: "#e8dfc8",
              border: "1px solid rgba(201,168,76,0.18)", borderRadius: 12,
              padding: "10px 14px", fontSize: 13, lineHeight: 1.5,
              fontFamily: "'Lora', serif", maxHeight: 100, overflowY: "auto",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.48)"}
            onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.18)"}
          />
          <button
            className="send-btn"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: "50%", border: "none",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              background: input.trim() && !loading ? "linear-gradient(135deg, #C9A84C, #a8872e)" : "rgba(201,168,76,0.13)",
              fontSize: 17, transition: "all 0.2s", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >{loading ? "⏳" : "⬆️"}</button>
        </div>
      </div>

      <div style={{ marginTop: 13, color: "rgba(201,168,76,0.3)", fontSize: 11, textAlign: "center", lineHeight: 1.8 }}>
        Resultados exclusivamente de fuentes oficiales · Nunca se generan fallos ficticios
      </div>
    </div>
  );
}
