import { PrismaClient } from '../../../generated/prisma/index.js';

let prisma;
export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

