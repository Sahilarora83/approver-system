import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

export const pool = process.env.DATABASE_URL
  ? new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 15, // Slightly lower max to avoid hitting Supabase free tier limits
    idleTimeoutMillis: 60000, // 1 minute
    connectionTimeoutMillis: 10000, // 10 seconds (Relaxed for reliable connection)
    ssl: { rejectUnauthorized: false } // Required for some hosted DBs
  })
  : null;

// @ts-ignore
export const db = pool ? drizzle(pool, { schema }) : null;
