import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import { getSettings } from "../services/availability.js";

export const settingsRouter = Router();
settingsRouter.use(authMiddleware);

settingsRouter.get("/", async (_req, res) => {
  const s = await getSettings();
  res.json(s);
});

settingsRouter.patch("/", async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Apenas administradores podem alterar limites." });
    }
    const current = await getSettings();
    const { minRoomsAvailableWarn, occupancyWarnPercent } = req.body;

    const data = {};
    if (minRoomsAvailableWarn != null) {
      const v = Number(minRoomsAvailableWarn);
      if (v < 0 || v > 500) {
        return res.status(400).json({ error: "minRoomsAvailableWarn inválido." });
      }
      data.minRoomsAvailableWarn = v;
    }
    if (occupancyWarnPercent != null) {
      const v = Number(occupancyWarnPercent);
      if (v < 0 || v > 100) {
        return res.status(400).json({ error: "occupancyWarnPercent deve estar entre 0 e 100." });
      }
      data.occupancyWarnPercent = v;
    }

    const updated = await prisma.hotelSettings.update({
      where: { id: current.id },
      data,
    });

    await logAudit({
      userId: req.user.id,
      entityType: "HotelSettings",
      entityId: updated.id,
      action: "UPDATE",
      details: { before: current, after: updated },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao salvar configurações." });
  }
});
