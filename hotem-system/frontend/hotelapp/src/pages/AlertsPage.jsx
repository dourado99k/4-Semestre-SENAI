import { useEffect, useState } from "react";
import { api } from "../api.js";

const typeLabel = {
  LOW_AVAILABILITY: "Poucos quartos livres",
  NEAR_FULL_OCCUPANCY: "Capacidade elevada",
  OVERBOOKING_BLOCKED: "Bloqueio de overbooking",
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const list = await api(`/alerts${onlyOpen ? "?open=true" : ""}`);
    setAlerts(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [onlyOpen]);

  async function ack(id) {
    setError("");
    try {
      await api(`/alerts/${id}/ack`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Alertas de disponibilidade</h1>
          <p className="muted">Gerados automaticamente com base em ocupação e limites configurados</p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          Somente em aberto
        </label>
      </header>
      {error ? <div className="banner banner-error">{error}</div> : null}

      <section className="panel">
        <div className="alert-list">
          {alerts.length === 0 ? (
            <p className="muted">Nenhum alerta para exibir.</p>
          ) : (
            alerts.map((a) => (
              <article key={a.id} className={`alert-card ${a.acknowledged ? "alert-done" : "alert-open"}`}>
                <div className="alert-head">
                  <span className="pill">{typeLabel[a.type] || a.type}</span>
                  <span className="muted small">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <p>{a.message}</p>
                {a.acknowledged ? (
                  <p className="muted small">
                    Reconhecido por {a.acknowledgedBy?.name || "—"} em{" "}
                    {a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString() : "—"}
                  </p>
                ) : (
                  <button type="button" className="btn btn-secondary" onClick={() => ack(a.id)}>
                    Marcar como visto
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
