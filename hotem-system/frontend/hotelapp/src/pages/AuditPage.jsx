import { useEffect, useState } from "react";
import { api } from "../api.js";

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = entityType ? `?entityType=${encodeURIComponent(entityType)}` : "";
        const list = await api(`/audit${q}`);
        if (!cancelled) setLogs(list);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Histórico de operações</h1>
          <p className="muted">Cada movimentação registra responsável e data para auditoria</p>
        </div>
      </header>
      {error ? <div className="banner banner-error">{error}</div> : null}

      <section className="panel">
        <div className="toolbar">
          <label>
            Filtrar por entidade
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">Todas</option>
              <option value="Room">Quarto</option>
              <option value="Guest">Hóspede</option>
              <option value="Reservation">Reserva</option>
              <option value="AvailabilityAlert">Alerta</option>
              <option value="HotelSettings">Configurações</option>
              <option value="User">Usuário</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Data/hora</th>
                <th>Responsável</th>
                <th>Entidade</th>
                <th>Ação</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="small">{new Date(l.performedAt).toLocaleString()}</td>
                  <td>
                    <div>{l.user?.name}</div>
                    <div className="muted small">{l.user?.email}</div>
                  </td>
                  <td>
                    {l.entityType} {l.entityId ? <span className="muted small">({l.entityId.slice(0, 8)}…)</span> : null}
                  </td>
                  <td>
                    <span className="pill">{l.action}</span>
                  </td>
                  <td className="small mono">
                    {l.details ? (
                      <details>
                        <summary>JSON</summary>
                        <pre className="pre-json">{l.details}</pre>
                      </details>
                    ) : (
                      "—"
                    )}
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
