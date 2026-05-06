import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const auditRouter = Router();
auditRouter.use(authMiddleware);

auditRouter.get("/", async (req, res) => {
  const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
  const take = Math.min(Number(req.query.limit) || 100, 500);

  const logs = await prisma.auditLog.findMany({
    where: entityType ? { entityType } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { performedAt: "desc" },
    take,
  });
  res.json(logs);
});
