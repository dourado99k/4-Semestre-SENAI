## Instale o Prisma CLI como uma dependência de desenvolvimento:
npm install prisma --save-dev

## Inicie o Prisma para criar a pasta prisma e o arquivo .env: 
npx prisma init

## Criar as Tabelas no Banco (Migrations) // Execute o comando para sincronizar o schema com o banco de dados
npx prisma migrate dev --name init

Exemplos: 
npx prisma migrate dev --name create_usuario_table
npx prisma migrate dev --name add_campo_senha
npx prisma migrate dev --name alter_tipo_email


## Rodar o Prisma Client
npx prisma generate

## Rodar o Prisma Seed
npx prisma db seed

------------------------------------------------------------------------------

PRISMA - GUIA RÁPIDO DO ZERO

1. Instalar o Prisma (ferramenta)
npm install prisma --save-dev

Isso instala o CLI (quem executa os comandos do Prisma)

2. Inicializar o projeto Prisma
npx prisma init

Cria:
- pasta prisma/
- arquivo .env (configuração do banco)


3. Configurar o banco de dados

No arquivo .env:
DATABASE_URL="mysql://usuario:senha@localhost:3306/seubanco"

No schema.prisma:
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

Sem isso, o Prisma não conecta no banco.


4. Criar os modelos (tabelas)

Exemplo:
model Usuario {
  id    Int    @id @default(autoincrement())
  nome  String
  email String @unique
  senha String
}

Aqui você define a estrutura do banco.


5. Criar as tabelas no banco (MIGRATION)

npx prisma migrate dev --name init

Explicação:
- migrate = cria ou atualiza tabelas
- --name = nome da alteração

Exemplos:
npx prisma migrate dev --name create_usuario_table
npx prisma migrate dev --name add_campo_senha
npx prisma migrate dev --name alter_tipo_email


6. Gerar o Prisma Client

npx prisma generate

Isso cria o código que permite usar no Node.js:
prisma.usuario.create(...)


7. Inserir dados iniciais (SEED)

npx prisma db seed

Usado para:
- criar usuário admin
- inserir dados padrão
- popular banco para testes


RESUMO PARA MEMORIZAR

Fluxo:
1. Instala
2. Inicia
3. Configura banco
4. Cria model
5. Migra
6. Gera client
7. Popula dados

Frase para decorar:
Modela → Migra → Gera → Usa → Popula


ERROS COMUNS

- Esquecer DATABASE_URL
- Não rodar prisma generate
- Achar que migrate insere dados
- Usar seed com skipDuplicates e achar que não funcionou

## resetar e reaplicar Migrations

npx prisma migrate reset