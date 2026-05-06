import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

export const alertsRouter = Router();
alertsRouter.use(authMiddleware);

alertsRouter.get("/", async (req, res) => {
  const onlyOpen = req.query.open === "1" || req.query.open === "true";
  const list = await prisma.availabilityAlert.findMany({
    where: onlyOpen ? { acknowledged: false } : undefined,
    include: {
      acknowledgedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(list);
});

alertsRouter.post("/:id/ack", async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await prisma.availabilityAlert.findUnique({ where: { id } });
    if (!alert) return res.status(404).json({ error: "Alerta não encontrado." });
    if (alert.acknowledged) {
      return res.json(alert);
    }
    const updated = await prisma.availabilityAlert.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedById: req.user.id,
      },
      include: {
        acknowledgedBy: { select: { id: true, name: true, email: true } },
      },
    });
    await logAudit({
      userId: req.user.id,
      entityType: "AvailabilityAlert",
      entityId: id,
      action: "ACKNOWLEDGE",
      details: { type: alert.type },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao reconhecer alerta." });
  }
});
