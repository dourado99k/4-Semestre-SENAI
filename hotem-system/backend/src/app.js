import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { roomsRouter } from "./routes/rooms.js";
import { guestsRouter } from "./routes/guests.js";
import { reservationsRouter } from "./routes/reservations.js";
import { alertsRouter } from "./routes/alerts.js";
import { auditRouter } from "./routes/audit.js";
import { settingsRouter } from "./routes/settings.js";
import { dashboardRouter } from "./routes/dashboard.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/rooms", roomsRouter);
  app.use("/guests", guestsRouter);
  app.use("/reservations", reservationsRouter);
  app.use("/alerts", alertsRouter);
  app.use("/audit", auditRouter);
  app.use("/settings", settingsRouter);
  app.use("/dashboard", dashboardRouter);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno." });
  });

  return app;
}
