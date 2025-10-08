import { PrismaClient } from '../../../generated/prisma/index.js';

let prisma;
export function getPrisma() {
  if (!prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    const urlWithTimeouts = databaseUrl 
      ? `${databaseUrl}?connect_timeout=3&pool_timeout=3&socket_timeout=3`
      : undefined;
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: urlWithTimeouts,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

