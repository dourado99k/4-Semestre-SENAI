import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

const port = Number(process.env.PORT) || 4000;

async function main() {
  await prisma.$connect();
  const app = createApp();
  app.listen(port, () => {
    console.log(`API hotel-gestao em http://localhost:${port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
