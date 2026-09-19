import net from 'net';
import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

let prismaInstance: PrismaClient | null = null;
let isPrismaConnected = false;

function parseDbHostAndPort(dbUrl: string): { host: string; port: number } | null {
  try {
    const normalized = dbUrl.replace(/^postgres(ql)?:\/\//i, 'http://');
    const u = new URL(normalized);
    return {
      host: u.hostname || 'localhost',
      port: u.port ? parseInt(u.port, 10) : 5432,
    };
  } catch {
    return null;
  }
}

async function canConnectToHost(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      cleanup();
      resolve(true);
    });
    socket.once('timeout', () => {
      cleanup();
      resolve(false);
    });
    socket.once('error', () => {
      cleanup();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

export function getPrisma(): PrismaClient | null {
  if (!config.databaseUrl || !isPrismaConnected) {
    return null;
  }
  return prismaInstance;
}

export async function testPrismaConnection(): Promise<boolean> {
  if (!config.databaseUrl) {
    isPrismaConnected = false;
    return false;
  }

  const endpoint = parseDbHostAndPort(config.databaseUrl);
  if (endpoint) {
    const reachable = await canConnectToHost(endpoint.host, endpoint.port, 1200);
    if (!reachable) {
      isPrismaConnected = false;
      prismaInstance = null;
      console.log(`[Taskflow DB] PostgreSQL host at ${endpoint.host}:${endpoint.port} is not reachable. Operating with built-in memory store.`);
      return false;
    }
  }

  try {
    if (!prismaInstance) {
      prismaInstance = new PrismaClient({
        datasources: {
          db: {
            url: config.databaseUrl,
          },
        },
        log: [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
      });

      // Handle events safely without uncaught stdout/stderr dumps
      (prismaInstance as any).$on?.('error', () => {});
      (prismaInstance as any).$on?.('warn', () => {});
    }

    // Quick test query with timeout
    await Promise.race([
      prismaInstance.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000)),
    ]);

    isPrismaConnected = true;
    console.log('[Taskflow DB] Successfully connected to PostgreSQL via Prisma.');
    return true;
  } catch {
    isPrismaConnected = false;
    if (prismaInstance) {
      try {
        await prismaInstance.$disconnect();
      } catch {
        // Disconnect silent catch
      }
      prismaInstance = null;
    }
    console.log('[Taskflow DB] PostgreSQL connection unavailable. Operating with built-in memory store.');
    return false;
  }
}

export function isDbConnected(): boolean {
  return isPrismaConnected;
}

