import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : null;

// @ts-ignore
export const db = pool ? drizzle(pool, { schema }) : null;
