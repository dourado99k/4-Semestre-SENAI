import express    from 'express';
import cors       from 'cors';
import jwt        from 'jsonwebtoken';
import bcrypt     from 'bcrypt';
import 'dotenv/config';

import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient();
const Role        = { ADMIN: 'ADMIN', USER: 'USER' };
const Status      = { PENDENTE:'PENDENTE', CONFIRMADO:'CONFIRMADO', EM_ANDAMENTO:'EM_ANDAMENTO', CONCLUIDO:'CONCLUIDO', CANCELADO:'CANCELADO' };
const TipoServico = { FAXINA_COMPLETA:'FAXINA_COMPLETA', FAXINA_RAPIDA:'FAXINA_RAPIDA', POS_OBRA:'POS_OBRA', COMERCIAL:'COMERCIAL' };

const app    = express();

const SECRET = process.env.JWT_SECRET || 'faxina_secret_2025';

app.use(cors());
app.use(express.json());

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

/** Extrai e valida o token JWT do header Authorization */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ erro: 'Token não fornecido' });

  try {
    req.usuario = jwt.verify(header.split(' ')[1], SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

/** Restringe a rota a administradores */
function adminOnly(req, res, next) {
  if (req.usuario.role !== Role.ADMIN)
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  next();
}

/** Campos públicos do usuário (nunca expõe senha) */
const usuarioPublico = {
  id: true, nome: true, email: true,
  cpf: true, telefone: true, role: true, createdAt: true,
};

// ════════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════════

/**
 * POST /auth/registro
 * Body: { nome, email, senha, cpf, telefone? }
 */
app.post('/auth/registro', async (req, res) => {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;

    if (!nome || !email || !senha || !cpf)
      return res.status(400).json({ erro: 'nome, email, senha e cpf são obrigatórios' });

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11)
      return res.status(400).json({ erro: 'CPF inválido' });

    const existe = await prisma.usuario.findFirst({
      where: { OR: [{ email }, { cpf: cpfLimpo }] },
    });
    if (existe)
      return res.status(409).json({ erro: 'E-mail ou CPF já cadastrado' });

    const senhaHash = await bcrypt.hash(senha, 10);
    const novo = await prisma.usuario.create({
      data: { nome, email, senha: senhaHash, cpf: cpfLimpo, telefone },
      select: usuarioPublico,
    });

    res.status(201).json(novo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao registrar usuário' });
  }
});

/**
 * POST /auth/login
 * Body: { email, senha }
 * Retorna: { token, usuario }
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ erro: 'email e senha são obrigatórios' });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario)
      return res.status(401).json({ erro: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(senha, usuario.senha);
    if (!ok)
      return res.status(401).json({ erro: 'Credenciais inválidas' });

    const payload = { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role };
    const token   = jwt.sign(payload, SECRET, { expiresIn: '24h' });

    res.json({ token, usuario: payload });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// AGENDAMENTOS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /agendamentos
 * Admin vê todos; cliente vê só os próprios.
 * Query params opcionais: status, tipoServico
 */
app.get('/agendamentos', authMiddleware, async (req, res) => {
  try {
    const { status, tipoServico } = req.query;

    const where = {};

    // cliente filtra pelo próprio id
    if (req.usuario.role !== Role.ADMIN)
      where.usuarioId = req.usuario.id;

    // filtros opcionais por query string
    if (status && Status[status])
      where.status = Status[status];

    if (tipoServico && TipoServico[tipoServico])
      where.tipoServico = TipoServico[tipoServico];

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: { usuario: { select: usuarioPublico } },
      orderBy: { dataHora: 'asc' },
    });

    res.json(agendamentos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar agendamentos' });
  }
});

/**
 * GET /agendamentos/:id
 */
app.get('/agendamentos/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const ag = await prisma.agendamento.findUnique({
      where: { id },
      include: { usuario: { select: usuarioPublico } },
    });

    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });

    if (req.usuario.role !== Role.ADMIN && ag.usuarioId !== req.usuario.id)
      return res.status(403).json({ erro: 'Acesso negado' });

    res.json(ag);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar agendamento' });
  }
});

/**
 * POST /agendamentos
 * Body: { dataHora, endereco, complemento?, cidade, tipoServico, comodos?, observacoes?, valor? }
 */
app.post('/agendamentos', authMiddleware, async (req, res) => {
  try {
    const { dataHora, endereco, complemento, cidade, tipoServico, comodos, observacoes, valor } = req.body;

    if (!dataHora || !endereco || !cidade || !tipoServico)
      return res.status(400).json({ erro: 'dataHora, endereco, cidade e tipoServico são obrigatórios' });

    if (!TipoServico[tipoServico])
      return res.status(400).json({ erro: `tipoServico inválido. Use: ${Object.keys(TipoServico).join(', ')}` });

    const data = new Date(dataHora);
    if (isNaN(data.getTime()))
      return res.status(400).json({ erro: 'dataHora inválida' });

    if (data < new Date())
      return res.status(400).json({ erro: 'Não é possível agendar no passado' });

    // Verifica conflito de horário (janela de 1 hora)
    const conflito = await prisma.agendamento.findFirst({
      where: {
        dataHora: {
          gte: new Date(data.getTime() - 60 * 60 * 1000),
          lte: new Date(data.getTime() + 60 * 60 * 1000),
        },
        status: { notIn: [Status.CANCELADO] },
      },
    });
    if (conflito)
      return res.status(409).json({ erro: 'Já existe um agendamento nesse horário (janela de 1h)' });

    const ag = await prisma.agendamento.create({
      data: {
        usuarioId:   req.usuario.id,
        dataHora:    data,
        endereco,
        complemento: complemento || null,
        cidade,
        tipoServico: TipoServico[tipoServico],
        comodos:     Number(comodos) || 1,
        observacoes: observacoes || null,
        valor:       valor != null ? Number(valor) : null,
      },
      include: { usuario: { select: usuarioPublico } },
    });

    res.status(201).json(ag);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao criar agendamento' });
  }
});

/**
 * PUT /agendamentos/:id
 * Admin pode atualizar qualquer campo, inclusive status e valor.
 * Cliente só pode editar agendamentos PENDENTE (sem alterar status/valor).
 */
app.put('/agendamentos/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const ag = await prisma.agendamento.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });

    const isAdmin = req.usuario.role === Role.ADMIN;

    if (!isAdmin) {
      if (ag.usuarioId !== req.usuario.id)
        return res.status(403).json({ erro: 'Acesso negado' });
      if (ag.status !== Status.PENDENTE)
        return res.status(400).json({ erro: 'Só é possível editar agendamentos com status PENDENTE' });
    }

    const { dataHora, endereco, complemento, cidade, tipoServico, comodos, observacoes, status, valor } = req.body;

    // Valida campos opcionais
    const novaData = dataHora ? new Date(dataHora) : undefined;
    if (novaData && isNaN(novaData.getTime()))
      return res.status(400).json({ erro: 'dataHora inválida' });

    if (tipoServico && !TipoServico[tipoServico])
      return res.status(400).json({ erro: `tipoServico inválido. Use: ${Object.keys(TipoServico).join(', ')}` });

    if (status && !isAdmin)
      return res.status(403).json({ erro: 'Apenas administradores podem alterar o status' });

    if (status && !Status[status])
      return res.status(400).json({ erro: `status inválido. Use: ${Object.keys(Status).join(', ')}` });

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data: {
        ...(novaData                           && { dataHora: novaData }),
        ...(endereco                           && { endereco }),
        ...(complemento !== undefined          && { complemento }),
        ...(cidade                             && { cidade }),
        ...(tipoServico                        && { tipoServico: TipoServico[tipoServico] }),
        ...(comodos                            && { comodos: Number(comodos) }),
        ...(observacoes !== undefined          && { observacoes }),
        ...(status && isAdmin                  && { status: Status[status] }),
        ...(valor  !== undefined && isAdmin    && { valor: valor != null ? Number(valor) : null }),
      },
      include: { usuario: { select: usuarioPublico } },
    });

    res.json(atualizado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao atualizar agendamento' });
  }
});

/**
 * DELETE /agendamentos/:id
 * Soft-delete: muda status para CANCELADO.
 * Admin cancela qualquer um; cliente cancela apenas o próprio se não concluído.
 */
app.delete('/agendamentos/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const ag = await prisma.agendamento.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });

    const isAdmin = req.usuario.role === Role.ADMIN;

    if (!isAdmin && ag.usuarioId !== req.usuario.id)
      return res.status(403).json({ erro: 'Acesso negado' });

    if (ag.status === Status.CANCELADO)
      return res.status(400).json({ erro: 'Agendamento já está cancelado' });

    if (!isAdmin && ag.status === Status.CONCLUIDO)
      return res.status(400).json({ erro: 'Não é possível cancelar um agendamento concluído' });

    await prisma.agendamento.update({
      where: { id },
      data:  { status: Status.CANCELADO },
    });

    res.json({ mensagem: 'Agendamento cancelado com sucesso' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao cancelar agendamento' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// ADMIN — USUÁRIOS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/usuarios
 * Lista todos os usuários com contagem de agendamentos.
 */
app.get('/admin/usuarios', authMiddleware, adminOnly, async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        ...usuarioPublico,
        updatedAt: true,
        _count: { select: { agendamentos: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(usuarios);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
});

/**
 * GET /admin/usuarios/:id
 * Detalhe de um usuário com todos os seus agendamentos.
 */
app.get('/admin/usuarios/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        ...usuarioPublico,
        agendamentos: { orderBy: { dataHora: 'asc' } },
      },
    });

    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
});

/**
 * PATCH /admin/usuarios/:id/role
 * Altera a role de um usuário (ADMIN ↔ USER).
 * Body: { role: "ADMIN" | "USER" }
 */
app.patch('/admin/usuarios/:id/role', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id   = Number(req.params.id);
    const { role } = req.body;

    if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });
    if (!Role[role]) return res.status(400).json({ erro: `role inválido. Use: ${Object.keys(Role).join(', ')}` });
    if (id === req.usuario.id) return res.status(400).json({ erro: 'Você não pode alterar a própria role' });

    const atualizado = await prisma.usuario.update({
      where: { id },
      data:  { role: Role[role] },
      select: usuarioPublico,
    });

    res.json(atualizado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao atualizar role' });
  }
});

/**
 * DELETE /admin/usuarios/:id
 * Remove um usuário (e seus agendamentos via onDelete: Cascade).
 */
app.delete('/admin/usuarios/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });
    if (id === req.usuario.id) return res.status(400).json({ erro: 'Você não pode remover a si mesmo' });

    const existe = await prisma.usuario.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ erro: 'Usuário não encontrado' });

    await prisma.usuario.delete({ where: { id } });
    res.json({ mensagem: 'Usuário removido com sucesso' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao remover usuário' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════════════════════════

app.get('/', (_req, res) => {
  res.json({ status: 'ok', sistema: '🧹 Faxina Fácil', versao: '2.0.0' });
});

// Handler de rotas não encontradas
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

export default app;