import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
  const rooms = [
    { type: 'junior', name: 'Junior Suite' },
    { type: 'king', name: 'King Suite' },
    { type: 'presidential', name: 'Presidential Suite' },
  ];
  for (const room of rooms) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
  }
  // eslint-disable-next-line no-console
  console.log('Seed completed');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
