import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import {
  countOverlappingForRoom,
  evaluateAndCreateAlerts,
} from "../services/availability.js";

export const reservationsRouter = Router();
reservationsRouter.use(authMiddleware);

function parseDate(d) {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

reservationsRouter.get("/", async (req, res) => {
  const from = req.query.from ? parseDate(req.query.from) : null;
  const to = req.query.to ? parseDate(req.query.to) : null;

  const where = {};
  if (from && to) {
    where.AND = [{ checkIn: { lt: to } }, { checkOut: { gt: from } }];
  }

  const list = await prisma.reservation.findMany({
    where,
    include: {
      room: true,
      guest: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { checkIn: "asc" },
    take: 500,
  });
  res.json(list);
});

reservationsRouter.post("/", async (req, res) => {
  try {
    const { roomId, guestId, checkIn, checkOut, status, notes } = req.body;
    const ci = parseDate(checkIn);
    const co = parseDate(checkOut);
    if (!roomId || !guestId || !ci || !co) {
      return res.status(400).json({ error: "roomId, guestId, checkIn e checkOut são obrigatórios." });
    }
    if (ci >= co) {
      return res.status(400).json({ error: "checkOut deve ser posterior a checkIn." });
    }

    const overlap = await countOverlappingForRoom(roomId, ci, co, null);
    if (overlap > 0) {
      await prisma.availabilityAlert.create({
        data: {
          type: "OVERBOOKING_BLOCKED",
          message: `Tentativa de reserva bloqueada: quarto já ocupado no período solicitado (${ci.toISOString()} — ${co.toISOString()}).`,
          contextJson: JSON.stringify({ roomId, guestId, checkIn: ci, checkOut: co }),
          relatedFrom: ci,
          relatedTo: co,
        },
      });
      await logAudit({
        userId: req.user.id,
        entityType: "Reservation",
        entityId: null,
        action: "OVERBOOKING_BLOCKED",
        details: { roomId, guestId, checkIn: ci, checkOut: co },
      });
      return res.status(409).json({
        error: "Conflito de datas: este quarto já possui reserva ativa nesse período. Operação bloqueada para evitar overbooking.",
        code: "OVERBOOKING_BLOCKED",
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        roomId,
        guestId,
        checkIn: ci,
        checkOut: co,
        status: status || "CONFIRMED",
        notes: notes ? String(notes) : null,
        createdById: req.user.id,
      },
      include: { room: true, guest: true, createdBy: { select: { id: true, name: true, email: true } } },
    });

    await logAudit({
      userId: req.user.id,
      entityType: "Reservation",
      entityId: reservation.id,
      action: "CREATE",
      details: {
        roomId,
        guestId,
        checkIn: ci,
        checkOut: co,
        status: reservation.status,
      },
    });

    const horizonStart = new Date(Math.min(ci.getTime(), Date.now()));
    const horizonEnd = new Date(Math.max(co.getTime(), Date.now() + 90 * 86400000));
    await evaluateAndCreateAlerts({ from: horizonStart, to: horizonEnd });

    res.status(201).json(reservation);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar reserva." });
  }
});

reservationsRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Reserva não encontrada." });

    const { roomId, guestId, checkIn, checkOut, status, notes } = req.body;
    const nextRoom = roomId ?? existing.roomId;
    const nextGuest = guestId ?? existing.guestId;
    const nextCi = checkIn != null ? parseDate(checkIn) : existing.checkIn;
    const nextCo = checkOut != null ? parseDate(checkOut) : existing.checkOut;

    if (!nextCi || !nextCo || nextCi >= nextCo) {
      return res.status(400).json({ error: "Datas inválidas." });
    }

    if (existing.status !== "CANCELLED") {
      const overlap = await countOverlappingForRoom(nextRoom, nextCi, nextCo, id);
      if (overlap > 0) {
        await prisma.availabilityAlert.create({
          data: {
            type: "OVERBOOKING_BLOCKED",
            message: `Alteração de reserva bloqueada por conflito de ocupação do quarto.`,
            contextJson: JSON.stringify({ reservationId: id, roomId: nextRoom, checkIn: nextCi, checkOut: nextCo }),
            relatedFrom: nextCi,
            relatedTo: nextCo,
          },
        });
        await logAudit({
          userId: req.user.id,
          entityType: "Reservation",
          entityId: id,
          action: "OVERBOOKING_BLOCKED",
          details: { attempted: { roomId: nextRoom, checkIn: nextCi, checkOut: nextCo } },
        });
        return res.status(409).json({
          error: "Conflito de datas com outra reserva ativa neste quarto.",
          code: "OVERBOOKING_BLOCKED",
        });
      }
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...(roomId != null && { roomId }),
        ...(guestId != null && { guestId }),
        ...(checkIn != null && { checkIn: nextCi }),
        ...(checkOut != null && { checkOut: nextCo }),
        ...(status != null && { status }),
        ...(notes !== undefined && { notes: notes ? String(notes) : null }),
      },
      include: { room: true, guest: true, createdBy: { select: { id: true, name: true, email: true } } },
    });

    await logAudit({
      userId: req.user.id,
      entityType: "Reservation",
      entityId: id,
      action: "UPDATE",
      details: { before: existing, after: reservation },
    });

    const horizonStart = new Date(Math.min(nextCi.getTime(), existing.checkIn.getTime(), Date.now()));
    const horizonEnd = new Date(
      Math.max(nextCo.getTime(), existing.checkOut.getTime(), Date.now() + 90 * 86400000)
    );
    await evaluateAndCreateAlerts({ from: horizonStart, to: horizonEnd });

    res.json(reservation);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar reserva." });
  }
});

reservationsRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Reserva não encontrada." });

    await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await logAudit({
      userId: req.user.id,
      entityType: "Reservation",
      entityId: id,
      action: "CANCEL",
      details: { previous: existing },
    });

    const horizonStart = new Date(Math.min(existing.checkIn.getTime(), Date.now()));
    const horizonEnd = new Date(Math.max(existing.checkOut.getTime(), Date.now() + 90 * 86400000));
    await evaluateAndCreateAlerts({ from: horizonStart, to: horizonEnd });

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao cancelar reserva." });
  }
});
