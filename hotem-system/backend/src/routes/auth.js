import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken, authMiddleware } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password e name são obrigatórios." });
    }
    const exists = await prisma.user.findUnique({ where: { email: String(email).trim() } });
    if (exists) {
      return res.status(409).json({ error: "E-mail já cadastrado." });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const userCount = await prisma.user.count();
    const user = await prisma.user.create({
      data: {
        email: String(email).trim().toLowerCase(),
        passwordHash,
        name: String(name).trim(),
        role: userCount === 0 ? "ADMIN" : "STAFF",
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    await logAudit({
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      details: { email: user.email, selfRegistration: true },
    });
    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao registrar." });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email e password são obrigatórios." });
    }
    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
    const safe = { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
    await logAudit({
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "LOGIN",
      details: {},
    });
    const token = signToken(safe);
    return res.json({ user: safe, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao entrar." });
  }
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});
