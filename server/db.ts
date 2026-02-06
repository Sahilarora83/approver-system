import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

export const pool = process.env.DATABASE_URL
  ? new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Max concurrent connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
  : null;

// @ts-ignore
export const db = pool ? drizzle(pool, { schema }) : null;
