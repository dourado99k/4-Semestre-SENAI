import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.hotelSettings.deleteMany().catch(() => {});
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.availabilityAlert.deleteMany().catch(() => {});
  await prisma.reservation.deleteMany().catch(() => {});
  await prisma.guest.deleteMany().catch(() => {});
  await prisma.room.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});

  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@hotel.local",
      passwordHash,
      name: "Administrador",
      role: "ADMIN",
    },
  });

  await prisma.hotelSettings.create({
    data: { minRoomsAvailableWarn: 2, occupancyWarnPercent: 80 },
  });

  const rooms = await prisma.$transaction([
    prisma.room.create({
      data: { number: "101", name: "Standard", type: "Standard", capacity: 2, floor: 1 },
    }),
    prisma.room.create({
      data: { number: "102", name: "Standard", type: "Standard", capacity: 2, floor: 1 },
    }),
    prisma.room.create({
      data: { number: "201", name: "Suíte", type: "Suíte", capacity: 3, floor: 2 },
    }),
  ]);

  const guest = await prisma.guest.create({
    data: {
      fullName: "Maria Exemplo",
      email: "maria@email.com",
      phone: "+5511999990000",
    },
  });

  const start = new Date();
  start.setHours(14, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  await prisma.reservation.create({
    data: {
      roomId: rooms[0].id,
      guestId: guest.id,
      checkIn: start,
      checkOut: end,
      status: "CONFIRMED",
      createdById: admin.id,
    },
  });

  console.log("Seed OK. Login: admin@hotel.local / admin123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
