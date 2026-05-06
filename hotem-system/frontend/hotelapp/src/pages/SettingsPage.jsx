import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ minRoomsAvailableWarn: "", occupancyWarnPercent: "" });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await api("/settings");
        setSettings(s);
        setForm({
          minRoomsAvailableWarn: String(s.minRoomsAvailableWarn),
          occupancyWarnPercent: String(s.occupancyWarnPercent),
        });
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const updated = await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({
          minRoomsAvailableWarn: Number(form.minRoomsAvailableWarn),
          occupancyWarnPercent: Number(form.occupancyWarnPercent),
        }),
      });
      setSettings(updated);
      setMsg("Configurações salvas.");
    } catch (e) {
      setError(e.message);
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="page">
        <div className="banner banner-error">Apenas administradores podem alterar os limites de alerta.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Limites de alerta</h1>
          <p className="muted">
            Disparo automático quando a disponibilidade cai abaixo do mínimo ou a ocupação se aproxima da capacidade
          </p>
        </div>
      </header>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {msg ? <div className="banner banner-ok">{msg}</div> : null}

      <section className="panel">
        <form className="form-row" onSubmit={onSubmit}>
          <label>
            Mínimo de quartos livres (alerta)
            <input
              type="number"
              min={0}
              required
              value={form.minRoomsAvailableWarn}
              onChange={(e) => setForm({ ...form, minRoomsAvailableWarn: e.target.value })}
            />
            <span className="hint">Ex.: 3 — alerta quando restarem 3 ou menos quartos livres em um dia.</span>
          </label>
          <label>
            Ocupação para alerta (%)
            <input
              type="number"
              min={0}
              max={100}
              required
              value={form.occupancyWarnPercent}
              onChange={(e) => setForm({ ...form, occupancyWarnPercent: e.target.value })}
            />
            <span className="hint">Ex.: 85 — alerta quando a ocupação diária atingir 85% ou mais.</span>
          </label>
          <div className="form-actions span-2">
            <button className="btn btn-primary" type="submit" disabled={!settings}>
              Salvar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
