import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api("/dashboard/summary");
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="banner banner-error">{error}</div>;
  }
  if (!data) {
    return <div className="muted">Carregando painel…</div>;
  }

  const riskyDays = (data.occupancyNext30Days || []).filter(
    (d) => d.freeRooms <= (data.settings?.minRoomsAvailableWarn ?? 3) || d.occupancyPct >= (data.settings?.occupancyWarnPercent ?? 85)
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Painel</h1>
          <p className="muted">Visão geral de ocupação e alertas</p>
        </div>
        <Link className="btn btn-secondary" to="/reservas">
          Nova reserva
        </Link>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Quartos ativos</div>
          <div className="stat-value">{data.roomsActive}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hóspedes</div>
          <div className="stat-value">{data.guestsCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reservas ativas</div>
          <div className="stat-value">{data.reservationsActive}</div>
        </div>
        <div className="stat-card stat-card-warn">
          <div className="stat-label">Alertas em aberto</div>
          <div className="stat-value">{data.openAlerts}</div>
          <Link to="/alertas" className="stat-link">
            Ver alertas
          </Link>
        </div>
      </div>

      <section className="panel">
        <h2>Limites configurados</h2>
        <p className="muted small">
          Alerta de poucos quartos livres quando restam até{" "}
          <strong>{data.settings?.minRoomsAvailableWarn}</strong> unidades. Alerta de ocupação elevada a partir de{" "}
          <strong>{data.settings?.occupancyWarnPercent}%</strong>.
        </p>
      </section>

      <section className="panel">
        <h2>Próximos 30 dias — dias com risco</h2>
        {riskyDays.length === 0 ? (
          <p className="muted">Nenhum dia no período ultrapassou os limites atuais.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Livres</th>
                  <th>Ocupação</th>
                </tr>
              </thead>
              <tbody>
                {riskyDays.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{d.freeRooms}</td>
                    <td>{d.occupancyPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
