import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

function toInputDate(d) {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

export function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [guests, setGuests] = useState([]);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [form, setForm] = useState({
    roomId: "",
    guestId: "",
    checkIn: "",
    checkOut: "",
    status: "CONFIRMED",
    notes: "",
  });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const query = useMemo(() => {
    if (!filterStart || !filterEnd) return "";
    const from = new Date(filterStart).toISOString();
    const to = new Date(filterEnd).toISOString();
    return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }, [filterStart, filterEnd]);

  async function loadAll() {
    const [rlist, roomList, guestList] = await Promise.all([
      api(`/reservations${query}`),
      api("/rooms"),
      api("/guests"),
    ]);
    setReservations(rlist);
    setRooms(roomList.filter((x) => x.active));
    setGuests(guestList);
  }

  useEffect(() => {
    loadAll().catch((e) => setError(e.message));
  }, [query]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await api("/reservations", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          checkIn: new Date(form.checkIn).toISOString(),
          checkOut: new Date(form.checkOut).toISOString(),
        }),
      });
      setMsg("Reserva criada com sucesso.");
      setForm((f) => ({ ...f, notes: "", checkIn: "", checkOut: "" }));
      await loadAll();
    } catch (e) {
      setError(e.body?.code === "OVERBOOKING_BLOCKED" ? e.message : e.message);
    }
  }

  async function patchStatus(id, status) {
    setError("");
    try {
      await api(`/reservations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancelRes(id) {
    if (!window.confirm("Cancelar esta reserva?")) return;
    setError("");
    try {
      await api(`/reservations/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reservas</h1>
          <p className="muted">Gestão de estadias com bloqueio automático de overbooking</p>
        </div>
      </header>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {msg ? <div className="banner banner-ok">{msg}</div> : null}

      <section className="panel">
        <h2>Filtro por período (opcional)</h2>
        <div className="form-row">
          <label>
            De
            <input type="datetime-local" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          </label>
          <label>
            Até
            <input type="datetime-local" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setFilterStart(""); setFilterEnd(""); }}>
              Limpar filtro
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Nova reserva</h2>
        <form className="form-row" onSubmit={onSubmit}>
          <label>
            Quarto
            <select required value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
              <option value="">Selecione</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} — {r.type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hóspede
            <select required value={form.guestId} onChange={(e) => setForm({ ...form, guestId: e.target.value })}>
              <option value="">Selecione</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Check-in
            <input
              type="datetime-local"
              required
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
          </label>
          <label>
            Check-out
            <input
              type="datetime-local"
              required
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="PENDING">Pendente</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="CHECKED_IN">Em estadia</option>
              <option value="CHECKED_OUT">Encerrada</option>
            </select>
          </label>
          <label className="span-2">
            Observações
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div className="form-actions span-2">
            <button className="btn btn-primary" type="submit">
              Criar reserva
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Lista</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Quarto</th>
                <th>Hóspede</th>
                <th>Período</th>
                <th>Status</th>
                <th>Registrado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((rv) => (
                <tr key={rv.id}>
                  <td>{rv.room?.number}</td>
                  <td>{rv.guest?.fullName}</td>
                  <td className="small">
                    {toInputDate(rv.checkIn).replace("T", " ")} → {toInputDate(rv.checkOut).replace("T", " ")}
                  </td>
                  <td>
                    <span className="pill">{rv.status}</span>
                  </td>
                  <td className="muted small">
                    {rv.createdBy?.name}
                    <div>{new Date(rv.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="table-actions">
                    <select
                      className="btn btn-sm"
                      value={rv.status}
                      onChange={(e) => patchStatus(rv.id, e.target.value)}
                      disabled={rv.status === "CANCELLED"}
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="CONFIRMED">Confirmada</option>
                      <option value="CHECKED_IN">Em estadia</option>
                      <option value="CHECKED_OUT">Encerrada</option>
                      <option value="CANCELLED">Cancelada</option>
                    </select>
                    {rv.status !== "CANCELLED" ? (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => cancelRes(rv.id)}>
                        Cancelar
                      </button>
                    ) : null}
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
