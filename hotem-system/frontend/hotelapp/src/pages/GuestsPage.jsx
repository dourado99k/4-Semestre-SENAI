import { useEffect, useState } from "react";
import { api } from "../api.js";

const empty = { fullName: "", email: "", phone: "", documentId: "", notes: "" };

export function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const list = await api(`/guests${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setGuests(list);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api(`/guests/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await api("/guests", { method: "POST", body: JSON.stringify(form) });
      }
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(g) {
    setEditingId(g.id);
    setForm({
      fullName: g.fullName,
      email: g.email || "",
      phone: g.phone || "",
      documentId: g.documentId || "",
      notes: g.notes || "",
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Hóspedes</h1>
          <p className="muted">Cadastro para vincular às reservas</p>
        </div>
      </header>
      {error ? <div className="banner banner-error">{error}</div> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="search"
            placeholder="Buscar por nome, e-mail, telefone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <h2>{editingId ? "Editar hóspede" : "Novo hóspede"}</h2>
        <form className="form-row" onSubmit={onSubmit}>
          <label>
            Nome completo *
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label>
            E-mail
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Telefone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Documento
            <input value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} />
          </label>
          <label className="span-2">
            Observações
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div className="form-actions span-2">
            <button className="btn btn-primary" type="submit">
              {editingId ? "Salvar" : "Cadastrar"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(empty); }}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Lista</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td>{g.fullName}</td>
                  <td className="muted small">
                    {[g.email, g.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => startEdit(g)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
