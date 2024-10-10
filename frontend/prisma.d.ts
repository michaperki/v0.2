
// prisma.d.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // Use globalThis instead of global
  var prisma: PrismaClient | undefined;
}

// Export empty to ensure the file is treated as a module
export {};

