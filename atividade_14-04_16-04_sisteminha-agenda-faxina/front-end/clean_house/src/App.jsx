import { useState, useEffect, createContext, useContext, useCallback } from "react";

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ════════════════════════════════════════════════════════════════════════════════
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ════════════════════════════════════════════════════════════════════════════════
// API
// ════════════════════════════════════════════════════════════════════════════════
const BASE = "http://localhost:8081";

async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || data.error || "Erro desconhecido");
  return data;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS — alinhados com os enums do Prisma (MAIÚSCULO)
// ════════════════════════════════════════════════════════════════════════════════
const TIPOS = {
  FAXINA_COMPLETA: { label: "Faxina Completa", emoji: "🏠", cor: "#4f86c6" },
  FAXINA_RAPIDA:   { label: "Faxina Rápida",   emoji: "⚡", cor: "#5cb85c" },
  POS_OBRA:        { label: "Pós-Obra",         emoji: "🔨", cor: "#e8a838" },
  COMERCIAL:       { label: "Comercial",        emoji: "🏢", cor: "#9b59b6" },
};

const STATUS = {
  PENDENTE:     { label: "Pendente",     bg: "#fff3cd", txt: "#856404", dot: "#ffc107" },
  CONFIRMADO:   { label: "Confirmado",   bg: "#d1ecf1", txt: "#0c5460", dot: "#17a2b8" },
  EM_ANDAMENTO: { label: "Em Andamento", bg: "#cce5ff", txt: "#004085", dot: "#007bff" },
  CONCLUIDO:    { label: "Concluído",    bg: "#d4edda", txt: "#155724", dot: "#28a745" },
  CANCELADO:    { label: "Cancelado",    bg: "#f8d7da", txt: "#721c24", dot: "#dc3545" },
};

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════
const fmtData  = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" });
const fmtHora  = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
const fmtValor = (v)   => v != null ? Number(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" }) : "—";

// ════════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ════════════════════════════════════════════════════════════════════════════════
const S = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#e8f4f8 0%,#f0f7ee 50%,#fef9e7 100%)",
    fontFamily: "'Segoe UI',system-ui,sans-serif",
    color: "#2c3e50",
  },
  nav: {
    background: "#fff",
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: { fontSize: 22, fontWeight: 800, color: "#2980b9", letterSpacing: -0.5 },
  container: { maxWidth: 1100, margin: "0 auto", padding: "32px 16px" },
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,.07)",
    padding: 24,
    marginBottom: 20,
  },
  btn:        { background:"#2980b9", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, fontSize:14, cursor:"pointer" },
  btnOutline: { background:"transparent", color:"#2980b9", border:"2px solid #2980b9", borderRadius:10, padding:"8px 18px", fontWeight:700, fontSize:14, cursor:"pointer" },
  btnDanger:  { background:"#e74c3c", color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" },
  btnSuccess: { background:"#27ae60", color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" },
  input: {
    width:"100%", border:"2px solid #e0e8f0", borderRadius:10,
    padding:"10px 14px", fontSize:14, outline:"none",
    boxSizing:"border-box", background:"#fafcfe",
  },
  label:  { display:"block", fontWeight:600, fontSize:13, marginBottom:6, color:"#4a6274" },
  grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  alert:  (ok) => ({ background: ok ? "#d4edda" : "#fde", color: ok ? "#155724" : "#c0392b", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, fontWeight:600 }),
  badge:  (st) => ({
    display:"inline-flex", alignItems:"center", gap:6,
    background: STATUS[st]?.bg || "#eee",
    color:      STATUS[st]?.txt || "#333",
    borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700,
  }),
};

// ════════════════════════════════════════════════════════════════════════════════
// ATOMS
// ════════════════════════════════════════════════════════════════════════════════
function Badge({ status }) {
  const s = STATUS[status] || STATUS.PENDENTE;
  return (
    <span style={S.badge(status)}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:s.dot, display:"inline-block" }} />
      {s.label}
    </span>
  );
}

function Field({ label, children }) {
  return <div><label style={S.label}>{label}</label>{children}</div>;
}

function Input({ label, ...p }) {
  return <Field label={label}><input style={S.input} {...p} /></Field>;
}

function Select({ label, children, ...p }) {
  return <Field label={label}><select style={S.input} {...p}>{children}</select></Field>;
}

function Textarea({ label, ...p }) {
  return <Field label={label}><textarea style={{ ...S.input, minHeight:80, resize:"vertical" }} {...p} /></Field>;
}

function Alert({ msg, ok }) {
  if (!msg) return null;
  return <div style={S.alert(ok)}>{msg}</div>;
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={{ display:"flex", gap:6, alignItems:"baseline" }}>
      <span>{icon}</span>
      <span style={{ fontSize:12, color:"#7f8c8d" }}>{label}:</span>
      <span style={{ fontSize:13, fontWeight:600 }}>{value}</span>
    </div>
  );
}

function MetricCard({ label, value, emoji, color }) {
  return (
    <div style={{ ...S.card, textAlign:"center", padding:"20px 16px", borderTop:`4px solid ${color}` }}>
      <div style={{ fontSize:30, marginBottom:6 }}>{emoji}</div>
      <div style={{ fontSize:32, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:12, color:"#7f8c8d", fontWeight:600, marginTop:2 }}>{label}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL — AGENDAMENTO
// ════════════════════════════════════════════════════════════════════════════════
function ModalAgendamento({ agendamento, isAdmin, token, onSave, onClose }) {
  const isEdit = !!agendamento?.id;

  const [form, setForm] = useState({
    dataHora:    agendamento?.dataHora ? new Date(agendamento.dataHora).toISOString().slice(0,16) : "",
    endereco:    agendamento?.endereco    || "",
    complemento: agendamento?.complemento || "",
    cidade:      agendamento?.cidade      || "",
    tipoServico: agendamento?.tipoServico || "FAXINA_COMPLETA",
    comodos:     agendamento?.comodos     || 1,
    observacoes: agendamento?.observacoes || "",
    status:      agendamento?.status      || "PENDENTE",
    valor:       agendamento?.valor       ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (isEdit) {
        await apiFetch(`/agendamentos/${agendamento.id}`, { method:"PUT", body:JSON.stringify(form) }, token);
      } else {
        await apiFetch("/agendamentos", { method:"POST", body:JSON.stringify(form) }, token);
      }
      onSave();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
      <div style={{ ...S.card, width:"100%", maxWidth:580, maxHeight:"90vh", overflowY:"auto", margin:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>
            {isEdit ? "✏️ Editar Agendamento" : "➕ Novo Agendamento"}
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#7f8c8d" }}>✕</button>
        </div>

        <Alert msg={msg} ok={false} />

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={S.grid2}>
            <Input label="📅 Data e Hora *" type="datetime-local" value={form.dataHora} onChange={set("dataHora")} required />
            <Select label="🧹 Tipo de Serviço *" value={form.tipoServico} onChange={set("tipoServico")} required>
              {Object.entries(TIPOS).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </Select>
          </div>

          <Input label="📍 Endereço *" value={form.endereco} onChange={set("endereco")} placeholder="Rua, número" required />

          <div style={S.grid2}>
            <Input label="Complemento"  value={form.complemento} onChange={set("complemento")} placeholder="Apto, bloco..." />
            <Input label="Cidade *"     value={form.cidade}      onChange={set("cidade")}      required />
          </div>

          <div style={S.grid2}>
            <Input label="🚪 Cômodos" type="number" min={1} max={20} value={form.comodos} onChange={set("comodos")} />
            {isAdmin && (
              <Input label="💰 Valor (R$)" type="number" step="0.01" min="0" value={form.valor} onChange={set("valor")} placeholder="0,00" />
            )}
          </div>

          {isAdmin && isEdit && (
            <Select label="📌 Status" value={form.status} onChange={set("status")}>
              {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          )}

          <Textarea label="📝 Observações" value={form.observacoes} onChange={set("observacoes")}
            placeholder="Tem pets? Preferências de produtos? Acesso especial?" />

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
            <button type="button" onClick={onClose} style={S.btnOutline}>Cancelar</button>
            <button type="submit" style={S.btn} disabled={loading}>
              {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar agendamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// CARD — AGENDAMENTO
// ════════════════════════════════════════════════════════════════════════════════
function AgendamentoCard({ ag, isAdmin, token, onRefresh }) {
  const [editando,    setEditando]    = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const tipo = TIPOS[ag.tipoServico] || { label: ag.tipoServico, emoji:"🧹", cor:"#999" };

  const podeEditar   = isAdmin || ag.status === "PENDENTE";
  const podeCancelar = ag.status !== "CANCELADO" && ag.status !== "CONCLUIDO";

  async function cancelar() {
    if (!confirmando) { setConfirmando(true); return; }
    try {
      await apiFetch(`/agendamentos/${ag.id}`, { method:"DELETE" }, token);
      onRefresh();
    } catch (e) { alert(e.message); }
  }

  return (
    <>
      {editando && (
        <ModalAgendamento
          agendamento={ag}
          isAdmin={isAdmin}
          token={token}
          onSave={() => { setEditando(false); onRefresh(); }}
          onClose={() => setEditando(false)}
        />
      )}

      <div style={{ ...S.card, borderLeft:`5px solid ${tipo.cor}`, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
          <div style={{ flex:1 }}>
            {/* Header do card */}
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:12 }}>
              <span style={{ fontSize:24 }}>{tipo.emoji}</span>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>{tipo.label}</div>
                {isAdmin && ag.usuario && (
                  <div style={{ fontSize:12, color:"#7f8c8d" }}>
                    👤 {ag.usuario.nome} — {ag.usuario.email}
                    {ag.usuario.telefone && ` — 📞 ${ag.usuario.telefone}`}
                  </div>
                )}
              </div>
              <Badge status={ag.status} />
            </div>

            {/* Detalhes */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"6px 20px" }}>
              <InfoItem icon="📅" label="Data"     value={fmtData(ag.dataHora)} />
              <InfoItem icon="⏰" label="Hora"     value={fmtHora(ag.dataHora)} />
              <InfoItem icon="📍" label="Endereço" value={`${ag.endereco}${ag.complemento?`, ${ag.complemento}`:""} — ${ag.cidade}`} />
              <InfoItem icon="🚪" label="Cômodos"  value={ag.comodos} />
              {ag.valor != null && <InfoItem icon="💰" label="Valor" value={fmtValor(ag.valor)} />}
            </div>

            {ag.observacoes && (
              <div style={{ marginTop:10, background:"#f8fafc", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#4a6274" }}>
                📝 {ag.observacoes}
              </div>
            )}
          </div>

          {/* Ações */}
          <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
            {podeEditar && (
              <button onClick={() => setEditando(true)} style={S.btnOutline}>✏️ Editar</button>
            )}
            {podeCancelar && (
              <button onClick={cancelar} style={S.btnDanger}>
                {confirmando ? "Confirmar?" : "🗑️ Cancelar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PAINEL ADMIN — USUÁRIOS
// ════════════════════════════════════════════════════════════════════════════════
function PainelUsuarios({ token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/usuarios", {}, token);
      setUsuarios(data);
    } catch (e) { setMsg(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  async function alterarRole(id, roleAtual) {
    const novaRole = roleAtual === "ADMIN" ? "USER" : "ADMIN";
    try {
      await apiFetch(`/admin/usuarios/${id}/role`, { method:"PATCH", body:JSON.stringify({ role:novaRole }) }, token);
      carregar();
    } catch (e) { alert(e.message); }
  }

  async function remover(id, nome) {
    if (!confirm(`Remover usuário "${nome}"? Isso também apaga os agendamentos.`)) return;
    try {
      await apiFetch(`/admin/usuarios/${id}`, { method:"DELETE" }, token);
      carregar();
    } catch (e) { alert(e.message); }
  }

  return (
    <div style={S.card}>
      <h3 style={{ margin:"0 0 16px", fontWeight:800 }}>👥 Usuários cadastrados</h3>
      <Alert msg={msg} ok={false} />

      {loading ? (
        <p style={{ color:"#7f8c8d" }}>⏳ Carregando...</p>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f0f7ee" }}>
                {["ID","Nome","E-mail","Telefone","Role","Agendamentos","Ações"].map(h => (
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, color:"#4a6274" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderBottom:"1px solid #f0f4f8" }}>
                  <td style={{ padding:"10px 12px" }}>{u.id}</td>
                  <td style={{ padding:"10px 12px", fontWeight:600 }}>{u.nome}</td>
                  <td style={{ padding:"10px 12px", color:"#7f8c8d" }}>{u.email}</td>
                  <td style={{ padding:"10px 12px" }}>{u.telefone || "—"}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ ...S.badge(u.role === "ADMIN" ? "CONFIRMADO" : "PENDENTE"), fontSize:11 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding:"10px 12px", textAlign:"center" }}>{u._count?.agendamentos ?? 0}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => alterarRole(u.id, u.role)} style={{ ...S.btnOutline, padding:"4px 10px", fontSize:12 }}>
                        {u.role === "ADMIN" ? "→ User" : "→ Admin"}
                      </button>
                      <button onClick={() => remover(u.id, u.nome)} style={{ ...S.btnDanger, padding:"4px 10px", fontSize:12 }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════
function Dashboard({ usuario, token, onLogout }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [abaAdmin,     setAbaAdmin]     = useState("agendamentos"); // "agendamentos" | "usuarios"
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo,   setFiltroTipo]   = useState("todos");

  const isAdmin = usuario.role === "ADMIN";

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/agendamentos", {}, token);
      setAgendamentos(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = agendamentos.filter(a => {
    if (filtroStatus !== "todos" && a.status      !== filtroStatus) return false;
    if (filtroTipo   !== "todos" && a.tipoServico !== filtroTipo)   return false;
    return true;
  });

  const total      = agendamentos.length;
  const pendentes  = agendamentos.filter(a => a.status === "PENDENTE").length;
  const confirmados= agendamentos.filter(a => a.status === "CONFIRMADO").length;
  const concluidos = agendamentos.filter(a => a.status === "CONCLUIDO").length;

  return (
    <div style={S.root}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <div style={S.logo}>🧹 Faxina Fácil</div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {isAdmin && (
            <>
              <button
                onClick={() => setAbaAdmin("agendamentos")}
                style={{ ...( abaAdmin==="agendamentos" ? S.btn : S.btnOutline ), padding:"6px 14px" }}
              >
                📋 Agendamentos
              </button>
              <button
                onClick={() => setAbaAdmin("usuarios")}
                style={{ ...( abaAdmin==="usuarios" ? S.btn : S.btnOutline ), padding:"6px 14px" }}
              >
                👥 Usuários
              </button>
            </>
          )}
          <span style={{ fontSize:13, color:"#7f8c8d" }}>
            {isAdmin ? "👑 Admin" : "👤"} {usuario.nome}
          </span>
          <button onClick={onLogout} style={{ ...S.btnOutline, padding:"6px 14px" }}>Sair</button>
        </div>
      </nav>

      <div style={S.container}>
        {/* ── Métricas ────────────────────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16, marginBottom:28 }}>
          <MetricCard label="Total"      value={total}       emoji="📋" color="#2980b9" />
          <MetricCard label="Pendentes"  value={pendentes}   emoji="⏳" color="#f39c12" />
          <MetricCard label="Confirmados"value={confirmados} emoji="✅" color="#17a2b8" />
          <MetricCard label="Concluídos" value={concluidos}  emoji="🏆" color="#27ae60" />
        </div>

        {/* ── Aba Usuários (admin) ─────────────────────────────────────── */}
        {isAdmin && abaAdmin === "usuarios" ? (
          <PainelUsuarios token={token} />
        ) : (
          <>
            {/* ── Header + botão ─────────────────────────────────────── */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontWeight:800, fontSize:22 }}>
                {isAdmin ? "Todos os Agendamentos" : "Meus Agendamentos"}
              </h2>
              <button onClick={() => setModal(true)} style={{ ...S.btn, padding:"12px 22px" }}>
                ➕ Novo Agendamento
              </button>
            </div>

            {/* ── Filtros ────────────────────────────────────────────── */}
            <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
              <select style={{ ...S.input, width:"auto", minWidth:160 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="todos">📌 Todos os status</option>
                {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select style={{ ...S.input, width:"auto", minWidth:180 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="todos">🧹 Todos os tipos</option>
                {Object.entries(TIPOS).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>

            {/* ── Lista ──────────────────────────────────────────────── */}
            {loading ? (
              <div style={{ textAlign:"center", padding:48, color:"#7f8c8d", fontSize:16 }}>⏳ Carregando...</div>
            ) : filtrados.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", padding:48 }}>
                <div style={{ fontSize:56, marginBottom:12 }}>🧹</div>
                <p style={{ color:"#7f8c8d", fontSize:16, margin:0 }}>
                  {agendamentos.length === 0
                    ? "Nenhum agendamento ainda. Crie o primeiro!"
                    : "Nenhum resultado para os filtros selecionados."}
                </p>
              </div>
            ) : (
              filtrados.map(ag => (
                <AgendamentoCard key={ag.id} ag={ag} isAdmin={isAdmin} token={token} onRefresh={carregar} />
              ))
            )}
          </>
        )}
      </div>

      {/* ── Modal novo agendamento ─────────────────────────────────────────── */}
      {modal && (
        <ModalAgendamento
          agendamento={null}
          isAdmin={isAdmin}
          token={token}
          onSave={() => { setModal(false); carregar(); }}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// LOGIN / REGISTRO
// ════════════════════════════════════════════════════════════════════════════════
function AuthPage({ onLogin }) {
  const [tab,     setTab]     = useState("login");
  const [form,    setForm]    = useState({ nome:"", email:"", senha:"", cpf:"", telefone:"" });
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);
  const [ok,      setOk]      = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (tab === "login") {
        const data = await apiFetch("/auth/login", { method:"POST", body:JSON.stringify({ email:form.email, senha:form.senha }) });
        onLogin(data);
      } else {
        await apiFetch("/auth/registro", { method:"POST", body:JSON.stringify(form) });
        setTab("login");
        setOk(true);
        setMsg("Cadastro realizado com sucesso! Faça login.");
        setForm(f => ({ ...f, nome:"", cpf:"", telefone:"" }));
      }
    } catch (err) {
      setOk(false);
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ ...S.root, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ ...S.card, width:"100%", maxWidth:420, margin:0 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🧹</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#2980b9", margin:0 }}>Faxina Fácil</h1>
          <p style={{ color:"#7f8c8d", margin:"4px 0 0" }}>Sistema de Agendamento</p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {["login","registro"].map(t => (
            <button key={t} onClick={() => { setTab(t); setMsg(null); }}
              style={{ flex:1, padding:10, border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer",
                background: tab===t ? "#2980b9" : "#eaf3fb",
                color:      tab===t ? "#fff"    : "#2980b9",
              }}>
              {t === "login" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        <Alert msg={msg} ok={ok} />

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {tab === "registro" && (
            <>
              <Input label="Nome completo *" value={form.nome}     onChange={set("nome")}     required />
              <Input label="CPF *"           value={form.cpf}      onChange={set("cpf")}      placeholder="00000000000" required />
              <Input label="Telefone"        value={form.telefone} onChange={set("telefone")} placeholder="(11) 9 0000-0000" />
            </>
          )}
          <Input label="E-mail *" type="email"    value={form.email} onChange={set("email")} required />
          <Input label="Senha *"  type="password" value={form.senha} onChange={set("senha")} required />

          <button type="submit" style={{ ...S.btn, width:"100%", padding:13, fontSize:15, marginTop:4 }} disabled={loading}>
            {loading ? "Carregando..." : tab==="login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("faxina_session")); }
    catch { return null; }
  });

  const handleLogin  = (data) => { sessionStorage.setItem("faxina_session", JSON.stringify(data)); setSession(data); };
  const handleLogout = ()     => { sessionStorage.removeItem("faxina_session"); setSession(null); };

  if (!session) return <AuthPage onLogin={handleLogin} />;

  return (
    <AuthContext.Provider value={session}>
      <Dashboard usuario={session.usuario} token={session.token} onLogout={handleLogout} />
    </AuthContext.Provider>
  );
}