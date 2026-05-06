import { prisma } from "../lib/prisma.js";

const ACTIVE_RESERVATION = {
  notIn: ["CANCELLED"],
};

/**
 * Conta reservas ativas que sobrepõem o intervalo [from, to) para um quarto.
 */
export async function countOverlappingForRoom(roomId, checkIn, checkOut, excludeReservationId) {
  const overlapping = await prisma.reservation.findMany({
    where: {
      roomId,
      status: ACTIVE_RESERVATION,
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
    },
    select: { id: true },
  });
  return overlapping.length;
}

export async function getSettings() {
  let s = await prisma.hotelSettings.findFirst();
  if (!s) {
    s = await prisma.hotelSettings.create({
      data: { minRoomsAvailableWarn: 3, occupancyWarnPercent: 85 },
    });
  }
  return s;
}

/**
 * Para cada dia no intervalo, calcula quartos ativos livres (sem reserva ativa sobreposta).
 */
export async function computeDailyFreeRooms(from, to) {
  const rooms = await prisma.room.findMany({
    where: { active: true },
    select: { id: true },
  });
  const totalRooms = rooms.length;
  if (totalRooms === 0) return { totalRooms: 0, days: [] };

  const reservations = await prisma.reservation.findMany({
    where: {
      status: ACTIVE_RESERVATION,
      AND: [{ checkIn: { lt: to } }, { checkOut: { gt: from } }],
    },
    select: { roomId: true, checkIn: true, checkOut: true },
  });

  const dayMs = 86400000;
  const days = [];
  for (let t = from.getTime(); t < to.getTime(); t += dayMs) {
    const dayStart = new Date(t);
    const dayEnd = new Date(t + dayMs);
    const busyRoomIds = new Set();
    for (const r of reservations) {
      if (r.checkIn < dayEnd && r.checkOut > dayStart) {
        busyRoomIds.add(r.roomId);
      }
    }
    const free = totalRooms - busyRoomIds.size;
    const occupancyPct =
      totalRooms > 0 ? Math.round((busyRoomIds.size / totalRooms) * 100) : 0;
    days.push({ date: dayStart.toISOString().slice(0, 10), freeRooms: free, occupancyPct });
  }
  return { totalRooms, days };
}

export async function evaluateAndCreateAlerts({ from, to, prismaTx = prisma }) {
  const settings = await getSettings();
  const { totalRooms, days } = await computeDailyFreeRooms(from, to);
  if (totalRooms === 0) return;

  const alerts = [];
  for (const d of days) {
    if (d.freeRooms <= 0) {
      alerts.push({
        type: "NEAR_FULL_OCCUPANCY",
        message: `Ocupação máxima em ${d.date}: nenhum quarto livre (risco de overbooking se houver vendas adicionais).`,
        contextJson: JSON.stringify({ date: d.date, freeRooms: d.freeRooms, occupancyPct: d.occupancyPct }),
        relatedFrom: new Date(d.date),
        relatedTo: new Date(d.date),
      });
    } else if (d.freeRooms <= settings.minRoomsAvailableWarn) {
      alerts.push({
        type: "LOW_AVAILABILITY",
        message: `Disponibilidade baixa em ${d.date}: apenas ${d.freeRooms} quarto(s) livre(s) (limite configurado: ${settings.minRoomsAvailableWarn}).`,
        contextJson: JSON.stringify({ date: d.date, freeRooms: d.freeRooms, threshold: settings.minRoomsAvailableWarn }),
        relatedFrom: new Date(d.date),
        relatedTo: new Date(d.date),
      });
    } else if (d.occupancyPct >= settings.occupancyWarnPercent) {
      alerts.push({
        type: "NEAR_FULL_OCCUPANCY",
        message: `Hotel próximo da capacidade em ${d.date}: ocupação ${d.occupancyPct}% (alerta a partir de ${settings.occupancyWarnPercent}%).`,
        contextJson: JSON.stringify({ date: d.date, occupancyPct: d.occupancyPct, threshold: settings.occupancyWarnPercent }),
        relatedFrom: new Date(d.date),
        relatedTo: new Date(d.date),
      });
    }
  }

  for (const a of alerts) {
    const recent = await prismaTx.availabilityAlert.findFirst({
      where: {
        type: a.type,
        acknowledged: false,
        relatedFrom: a.relatedFrom,
        message: a.message,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!recent) {
      await prismaTx.availabilityAlert.create({ data: a });
    }
  }
}
