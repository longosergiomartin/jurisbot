import { useState, useRef, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `Sos JurisBot, un asistente legal especializado en jurisprudencia argentina. Buscás fallos y resoluciones REALES en bases de datos judiciales argentinas.

FUENTES AUTORIZADAS:
1. SAIJ: https://saij.gob.ar
2. CSJN: https://sjconsulta.csjn.gov.ar y https://www.csjn.gov.ar
3. BCRA (sumarios financieros): https://www.bcra.gob.ar/sumarios-finacieros/

REGLAS ESTRICTAS:
- NUNCA inventes fallos, causas ni expedientes. Si no hay resultados reales, decilo.
- SIEMPRE incluí el link real a la fuente.
- Buscá activamente con web_search usando: site:saij.gob.ar [tema], site:sjconsulta.csjn.gov.ar [tema], site:bcra.gob.ar sumarios [tema]

FORMATO DE RESPUESTA:
1. Una sola línea directa respondiendo SÍ o NO, con contexto mínimo.
2. Si encontraste resultados: "Encontré [N] caso(s) relevante(s):" y luego los resultados.
3. Cada resultado:
📋 **[Carátula o título]**
🏛️ Tribunal: [nombre]
📅 Fecha: [fecha]
📝 Resumen: [máximo 3 líneas]
🔗 Fuente: [URL real]
---
SIN introducciones. SIN repetir la pregunta. Respondé directo.`;

const SUGGESTIONS = [
  "Despido durante licencia médica",
  "Infracciones cambiarias BCRA 2023",
  "Derecho al olvido digital CSJN",
  "Incompetencia BCRA en PLAyFT",
];

const ScalesIcon = ({ size = 20, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M4 7l8-4 8 4" />
    <path d="M4 7l4 8a4 4 0 0 1-8 0z" />
    <path d="M20 7l4 8a4 4 0 0 1-8 0z" />
    <line x1="6" y1="21" x2="18" y2="21" />
  </svg>
);

const MoonIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);

const SunIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const SendIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

function TypingDots({ accent }) {
  return (
    <div style={{ display: "flex", gap: 5, padding: "5px 2px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: accent, animation: "jbBounce 1.2s infinite", animationDelay: `${i*0.18}s` }} />
      ))}
    </div>
  );
}

function formatContent(text, linkColor) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j}>{part.slice(2,-2)}</strong>;
      return part.split(/(https?:\/\/[^\s]+)/g).map((seg, k) =>
        /^https?:\/\//.test(seg)
          ? <a key={k} href={seg} target="_blank" rel="noopener noreferrer" style={{ color: linkColor, textDecoration: "underline", wordBreak: "break-all" }}>{seg}</a>
          : seg
      );
    });
    return <div key={i} style={{ minHeight: line === "" ? 10 : undefined }}>{parts}</div>;
  });
}

function Bubble({ msg, dark }) {
  const isUser = msg.role === "user";
  const accent = dark ? "#8b5cf6" : "#6d28d9";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, animation: "jbFadeIn 0.28s ease forwards" }}>
      {!isUser && (
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, marginRight: 9, marginTop: 2, background: `linear-gradient(135deg, ${accent}, ${dark?"#3b0764":"#5b21b6"})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 2px 10px ${accent}55` }}>
          <ScalesIcon size={15} />
        </div>
      )}
      <div style={{
        maxWidth: "78%", padding: "10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        background: isUser ? accent : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)"),
        border: isUser ? "none" : `1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.08)"}`,
        color: isUser ? "#fff" : (dark ? "#f1f5f9" : "#1e293b"),
        fontSize: 13.5, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        boxShadow: isUser ? `0 4px 14px ${accent}33` : "none",
      }}>
        {msg.typing ? <TypingDots accent={dark?"#a78bfa":"#7c3aed"} /> : formatContent(msg.content, dark?"#93c5fd":"#1d4ed8")}
      </div>
    </div>
  );
}

export default function JurisBot() {
  const [dark, setDark] = useState(true);
  const [messages, setMessages] = useState([{ role:"assistant", content:`¡Hola! Soy **JurisBot** 🇦🇷\n\nBuscá fallos y resoluciones reales en **SAIJ**, **CSJN** y **BCRA**. Escribís en lenguaje natural y te traigo resultados verificables con link a la fuente.\n\n⚠️ Nunca invento casos. Si no encuentro resultados reales, te lo digo.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => {
    if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = Math.min(taRef.current.scrollHeight, 110) + "px"; }
  }, [input]);

  const send = useCallback(async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(p => [...p, {role:"user",content:q}, {role:"assistant",content:"",typing:true}]);
    setLoading(true);
    const nh = [...history, {role:"user",content:q}];
    try {
      const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({history:nh}) });
      const data = await res.json();
      const reply = data.reply || data.error || "No pude obtener resultados. Intentá reformular la búsqueda.";
      setHistory([...nh, {role:"assistant",content:reply}]);
      setMessages(p => [...p.slice(0,-1), {role:"assistant",content:reply}]);
    } catch {
      setMessages(p => [...p.slice(0,-1), {role:"assistant",content:"⚠️ Error de conexión. Intentá de nuevo."}]);
    }
    setLoading(false);
    setTimeout(() => taRef.current?.focus(), 100);
  }, [input, loading, history]);

  const accent = dark ? "#8b5cf6" : "#6d28d9";
  const d = {
    pageBg: dark ? "radial-gradient(ellipse at 20% 0%, #1e1040 0%, #0f0a1e 60%)" : "radial-gradient(ellipse at 20% 0%, #ede9fe 0%, #f5f3ff 60%)",
    panel: dark ? "rgba(255,255,255,0.05)" : "#fff",
    panelBorder: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    bar: dark ? "rgba(10,5,25,0.9)" : "rgba(255,255,255,0.95)",
    barBorder: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    inputBg: dark ? "rgba(255,255,255,0.07)" : "#f1f5f9",
    inputBorder: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
    inputFocus: dark ? "rgba(139,92,246,0.6)" : "rgba(109,40,217,0.45)",
    inputColor: dark ? "#f1f5f9" : "#1e293b",
    tagBg: dark ? "rgba(139,92,246,0.15)" : "rgba(109,40,217,0.08)",
    tagBorder: dark ? "rgba(139,92,246,0.4)" : "rgba(109,40,217,0.2)",
    tagColor: dark ? "#c4b5fd" : "#6d28d9",
    dot: dark ? "#4ade80" : "#16a34a",
    statusText: dark ? "rgba(241,245,249,0.45)" : "rgba(30,41,59,0.5)",
    suggestBg: dark ? "rgba(255,255,255,0.04)" : "#f1f5f9",
    suggestBorder: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
    suggestColor: dark ? "rgba(241,245,249,0.65)" : "#4c1d95",
    logoColor: dark ? "#a78bfa" : "#6d28d9",
    subtitle: dark ? "rgba(167,139,250,0.55)" : "rgba(109,40,217,0.45)",
    footer: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)",
    toggleBg: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    toggleColor: dark ? "#fbbf24" : "#64748b",
    sendOff: dark ? "rgba(139,92,246,0.2)" : "rgba(109,40,217,0.15)",
  };

  return (
    <div style={{ minHeight:"100vh", background:d.pageBg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"16px", transition:"background 0.4s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; } ::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.3); border-radius:2px; }
        @keyframes jbFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes jbBounce { 0%,80%,100%{transform:translateY(0);opacity:.35} 40%{transform:translateY(-7px);opacity:1} }
        @keyframes jbPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        textarea{resize:none;font-family:'DM Sans',sans-serif;} textarea:focus{outline:none;}
        .jb-sug:hover{opacity:1!important;transform:translateY(-1px);background:${dark?"rgba(255,255,255,0.09)":"#ede9fe"}!important;}
        .jb-send:hover:not(:disabled){filter:brightness(1.12);transform:scale(1.05);}
        .jb-tog:hover{opacity:.75;}
      `}</style>

      {/* Header */}
      <div style={{ width:"100%", maxWidth:640, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 2px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg, ${accent}, ${dark?"#4c1d95":"#5b21b6"})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 20px ${accent}55`, flexShrink:0 }}>
            <ScalesIcon size={21} />
          </div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:25, fontWeight:800, color:d.logoColor, letterSpacing:"-0.5px", lineHeight:1 }}>JurisBot</div>
            <div style={{ fontSize:10, color:d.subtitle, fontFamily:"'DM Sans',sans-serif", fontWeight:500, letterSpacing:"0.8px", marginTop:3 }}>JURISPRUDENCIA ARGENTINA VERIFICADA</div>
          </div>
        </div>
        <button className="jb-tog" onClick={()=>setDark(x=>!x)} style={{ width:38, height:38, borderRadius:"50%", border:"none", cursor:"pointer", background:d.toggleBg, color:d.toggleColor, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
          {dark ? <SunIcon/> : <MoonIcon/>}
        </button>
      </div>

      {/* Panel */}
      <div style={{ width:"100%", maxWidth:640, height:"min(68vh,570px)", background:d.panel, border:`1px solid ${d.panelBorder}`, borderRadius:22, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:dark?"0 28px 70px rgba(0,0,0,0.55)":"0 16px 50px rgba(109,40,217,0.13)", transition:"all 0.4s" }}>

        {/* Status bar */}
        <div style={{ padding:"9px 16px", borderBottom:`1px solid ${d.barBorder}`, display:"flex", alignItems:"center", gap:8, background:d.bar, backdropFilter:"blur(12px)", transition:"all 0.4s" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:d.dot, boxShadow:`0 0 7px ${d.dot}`, animation:"jbPulse 2s infinite", flexShrink:0 }}/>
          <span style={{ color:d.statusText, fontSize:11.5, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Activo · Fuentes oficiales verificadas</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:5 }}>
            {["SAIJ","CSJN","BCRA"].map(s=>(
              <span key={s} style={{ fontSize:9.5, padding:"2px 8px", borderRadius:20, fontWeight:600, background:d.tagBg, border:`1px solid ${d.tagBorder}`, color:d.tagColor, fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.3px" }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 14px" }}>
          {messages.map((m,i)=><Bubble key={i} msg={m} dark={dark}/>)}
          <div ref={bottomRef}/>
        </div>

        {/* Suggestions */}
        {messages.length===1 && (
          <div style={{ padding:"0 14px 10px", display:"flex", flexWrap:"wrap", gap:6 }}>
            {SUGGESTIONS.map((q,i)=>(
              <button key={i} className="jb-sug" onClick={()=>send(q)} style={{ padding:"5px 12px", borderRadius:20, cursor:"pointer", border:`1px solid ${d.suggestBorder}`, background:d.suggestBg, color:d.suggestColor, fontSize:11.5, fontFamily:"'DM Sans',sans-serif", fontWeight:500, transition:"all 0.2s", opacity:0.85 }}>{q}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:"11px 13px", borderTop:`1px solid ${d.barBorder}`, display:"flex", gap:9, alignItems:"flex-end", background:d.bar, transition:"all 0.4s" }}>
          <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Escribí tu búsqueda en lenguaje natural..." rows={1}
            style={{ flex:1, background:d.inputBg, color:d.inputColor, border:`1.5px solid ${d.inputBorder}`, borderRadius:13, padding:"9px 13px", fontSize:13.5, lineHeight:1.5, maxHeight:110, overflowY:"auto", transition:"border 0.25s" }}
            onFocus={e=>e.target.style.borderColor=d.inputFocus} onBlur={e=>e.target.style.borderColor=d.inputBorder}
          />
          <button className="jb-send" onClick={()=>send()} disabled={!input.trim()||loading}
            style={{ width:42, height:42, borderRadius:13, border:"none", flexShrink:0, cursor:input.trim()&&!loading?"pointer":"not-allowed", background:input.trim()&&!loading?accent:d.sendOff, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", boxShadow:input.trim()&&!loading?`0 4px 14px ${accent}44`:"none" }}>
            {loading ? <div style={{width:15,height:15,border:"2px solid rgba(255,255,255,0.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/> : <SendIcon/>}
          </button>
        </div>
      </div>

      <div style={{ marginTop:13, color:d.footer, fontSize:11, textAlign:"center", fontFamily:"'DM Sans',sans-serif", lineHeight:1.9 }}>
        Resultados exclusivamente de fuentes oficiales · Nunca se generan fallos ficticios
      </div>
    </div>
  );
}
