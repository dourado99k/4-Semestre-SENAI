import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { computeDailyFreeRooms, getSettings } from "../services/availability.js";

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

dashboardRouter.get("/summary", async (_req, res) => {
  const now = new Date();
  const to = new Date(now.getTime() + 30 * 86400000);

  const [roomsActive, guestsCount, reservationsActive, openAlerts, settings, daily] =
    await Promise.all([
      prisma.room.count({ where: { active: true } }),
      prisma.guest.count(),
      prisma.reservation.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.availabilityAlert.count({ where: { acknowledged: false } }),
      getSettings(),
      computeDailyFreeRooms(now, to),
    ]);

  res.json({
    roomsActive,
    guestsCount,
    reservationsActive,
    openAlerts,
    settings,
    occupancyNext30Days: daily.days,
    totalRooms: daily.totalRooms,
  });
});
