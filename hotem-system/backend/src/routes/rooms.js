import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import { evaluateAndCreateAlerts } from "../services/availability.js";

export const roomsRouter = Router();
roomsRouter.use(authMiddleware);

roomsRouter.get("/", async (_req, res) => {
  const rooms = await prisma.room.findMany({ orderBy: { number: "asc" } });
  res.json(rooms);
});

roomsRouter.post("/", async (req, res) => {
  try {
    const { number, name, type, capacity, floor, active, description } = req.body;
    if (!number || !type) {
      return res.status(400).json({ error: "number e type são obrigatórios." });
    }
    const room = await prisma.room.create({
      data: {
        number: String(number).trim(),
        name: name ? String(name) : null,
        type: String(type),
        capacity: capacity ? Number(capacity) : 2,
        floor: floor != null ? Number(floor) : null,
        active: active !== false,
        description: description ? String(description) : null,
      },
    });
    await logAudit({
      userId: req.user.id,
      entityType: "Room",
      entityId: room.id,
      action: "CREATE",
      details: { number: room.number, type: room.type },
    });
    const now = new Date();
    const horizon = new Date(now.getTime() + 90 * 86400000);
    await evaluateAndCreateAlerts({ from: now, to: horizon });
    res.status(201).json(room);
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Já existe quarto com este número." });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao criar quarto." });
  }
});

roomsRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { number, name, type, capacity, floor, active, description } = req.body;
    const before = await prisma.room.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: "Quarto não encontrado." });

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(number != null && { number: String(number).trim() }),
        ...(name !== undefined && { name: name ? String(name) : null }),
        ...(type != null && { type: String(type) }),
        ...(capacity != null && { capacity: Number(capacity) }),
        ...(floor !== undefined && { floor: floor != null ? Number(floor) : null }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(description !== undefined && { description: description ? String(description) : null }),
      },
    });
    await logAudit({
      userId: req.user.id,
      entityType: "Room",
      entityId: room.id,
      action: "UPDATE",
      details: { before, after: room },
    });
    const now = new Date();
    const horizon = new Date(now.getTime() + 90 * 86400000);
    await evaluateAndCreateAlerts({ from: now, to: horizon });
    res.json(room);
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Já existe quarto com este número." });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar quarto." });
  }
});

roomsRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: "Quarto não encontrado." });

    const pending = await prisma.reservation.count({
      where: { roomId: id, status: { not: "CANCELLED" } },
    });
    if (pending > 0) {
      return res.status(400).json({
        error: "Não é possível excluir: existem reservas ativas para este quarto. Inative o quarto ou cancele as reservas.",
      });
    }
    await prisma.room.delete({ where: { id } });
    await logAudit({
      userId: req.user.id,
      entityType: "Room",
      entityId: id,
      action: "DELETE",
      details: { deleted: room },
    });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir quarto." });
  }
});
