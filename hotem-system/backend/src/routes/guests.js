import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

export const guestsRouter = Router();
guestsRouter.use(authMiddleware);

guestsRouter.get("/", async (req, res) => {
  const q = req.query.q ? String(req.query.q).trim() : "";
  const guests = await prisma.guest.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { documentId: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { fullName: "asc" },
    take: 200,
  });
  res.json(guests);
});

guestsRouter.post("/", async (req, res) => {
  try {
    const { fullName, email, phone, documentId, notes } = req.body;
    if (!fullName) {
      return res.status(400).json({ error: "fullName é obrigatório." });
    }
    const guest = await prisma.guest.create({
      data: {
        fullName: String(fullName).trim(),
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        documentId: documentId ? String(documentId).trim() : null,
        notes: notes ? String(notes) : null,
      },
    });
    await logAudit({
      userId: req.user.id,
      entityType: "Guest",
      entityId: guest.id,
      action: "CREATE",
      details: { fullName: guest.fullName },
    });
    res.status(201).json(guest);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar hóspede." });
  }
});

guestsRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const before = await prisma.guest.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: "Hóspede não encontrado." });

    const { fullName, email, phone, documentId, notes } = req.body;
    const guest = await prisma.guest.update({
      where: { id },
      data: {
        ...(fullName != null && { fullName: String(fullName).trim() }),
        ...(email !== undefined && { email: email ? String(email).trim() : null }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(documentId !== undefined && { documentId: documentId ? String(documentId).trim() : null }),
        ...(notes !== undefined && { notes: notes ? String(notes) : null }),
      },
    });
    await logAudit({
      userId: req.user.id,
      entityType: "Guest",
      entityId: guest.id,
      action: "UPDATE",
      details: { before, after: guest },
    });
    res.json(guest);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar hóspede." });
  }
});

guestsRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) return res.status(404).json({ error: "Hóspede não encontrado." });

    const pending = await prisma.reservation.count({
      where: { guestId: id, status: { notIn: ["CANCELLED", "CHECKED_OUT"] } },
    });
    if (pending > 0) {
      return res.status(400).json({
        error: "Não é possível excluir: hóspede possui reservas ativas.",
      });
    }
    await prisma.guest.delete({ where: { id } });
    await logAudit({
      userId: req.user.id,
      entityType: "Guest",
      entityId: id,
      action: "DELETE",
      details: { deleted: guest },
    });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir hóspede." });
  }
});
