import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function run() {
  console.log("🌱 Iniciando seed...");

  const senhaHash = await bcrypt.hash('123456', 10);

  // Usuários
  await prisma.usuario.createMany({
    data: [
      {
        nome: "Admin",
        email: "admin@faxina.com",
        senha: senhaHash,
        cpf: "00000000000",
        telefone: "11999999999",
        role: "admin"
      },
      {
        nome: "João Silva",
        email: "joao@email.com",
        senha: senhaHash,
        cpf: "11111111111",
        telefone: "11988887777",
        role: "cliente"
      },
      {
        nome: "Maria Souza",
        email: "maria@email.com",
        senha: senhaHash,
        cpf: "22222222222",
        telefone: "11977776666",
        role: "cliente"
      }
    ],
    skipDuplicates: true
  });

  console.log("✅ Usuários inseridos");

  // Busca usuários para vincular agendamentos
  const joao = await prisma.usuario.findUnique({ where: { email: "joao@email.com" } });
  const maria = await prisma.usuario.findUnique({ where: { email: "maria@email.com" } });

  // Agendamentos de exemplo
  await prisma.agendamento.createMany({
    data: [
      {
        usuario_id: joao.id,
        dataHora: new Date("2025-04-20T09:00:00"),
        endereco: "Rua das Flores, 123",
        complemento: "Apto 45",
        cidade: "São Paulo",
        tipoServico: "faxina_completa",
        comodos: 3,
        observacoes: "Tem cachorro, favor cuidado com a porta",
        status: "confirmado",
        valor: 280.00
      },
      {
        usuario_id: maria.id,
        dataHora: new Date("2025-04-22T14:00:00"),
        endereco: "Av. Paulista, 1000",
        complemento: "Sala 12",
        cidade: "São Paulo",
        tipoServico: "faxina_rapida",
        comodos: 2,
        observacoes: null,
        status: "pendente",
        valor: 150.00
      },
      {
        usuario_id: joao.id,
        dataHora: new Date("2025-05-05T08:00:00"),
        endereco: "Rua Augusta, 500",
        complemento: null,
        cidade: "São Paulo",
        tipoServico: "pos_obra",
        comodos: 4,
        observacoes: "Apartamento recém reformado, muita poeira",
        status: "pendente",
        valor: 450.00
      }
    ]
  });

  console.log("✅ Agendamentos inseridos");
  console.log("🚀 Seed concluído com sucesso!");
}

run()
  .catch(e => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());