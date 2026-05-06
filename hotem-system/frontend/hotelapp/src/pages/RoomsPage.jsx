import { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { number: "", name: "", type: "Standard", capacity: 2, floor: "", description: "" };

export function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const list = await api("/rooms");
    setRooms(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      if (editingId) {
        await api(`/rooms/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...form,
            floor: form.floor === "" ? null : Number(form.floor),
            capacity: Number(form.capacity),
          }),
        });
        setMsg("Quarto atualizado.");
      } else {
        await api("/rooms", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            floor: form.floor === "" ? null : Number(form.floor),
            capacity: Number(form.capacity),
          }),
        });
        setMsg("Quarto cadastrado.");
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      number: r.number,
      name: r.name || "",
      type: r.type,
      capacity: r.capacity,
      floor: r.floor ?? "",
      description: r.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(r) {
    setError("");
    try {
      await api(`/rooms/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !r.active }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeRoom(r) {
    if (!window.confirm(`Excluir quarto ${r.number}?`)) return;
    setError("");
    try {
      await api(`/rooms/${r.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Quartos</h1>
          <p className="muted">Cadastro e gestão de unidades</p>
        </div>
      </header>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {msg ? <div className="banner banner-ok">{msg}</div> : null}

      <section className="panel">
        <h2>{editingId ? "Editar quarto" : "Novo quarto"}</h2>
        <form className="form-row" onSubmit={onSubmit}>
          <label>
            Número
            <input
              required
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              disabled={Boolean(editingId)}
            />
          </label>
          <label>
            Nome
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Tipo
            <input required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </label>
          <label>
            Capacidade
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </label>
          <label>
            Andar
            <input
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
            />
          </label>
          <label className="span-2">
            Descrição
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="form-actions span-2">
            <button className="btn btn-primary" type="submit">
              {editingId ? "Salvar alterações" : "Cadastrar"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancelar edição
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
                <th>Número</th>
                <th>Tipo</th>
                <th>Cap.</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td>{r.number}</td>
                  <td>{r.type}</td>
                  <td>{r.capacity}</td>
                  <td>{r.active ? <span className="pill pill-ok">Ativo</span> : <span className="pill">Inativo</span>}</td>
                  <td className="table-actions">
                    <button type="button" className="btn btn-sm" onClick={() => startEdit(r)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => toggleActive(r)}>
                      {r.active ? "Inativar" : "Ativar"}
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRoom(r)}>
                      Excluir
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
