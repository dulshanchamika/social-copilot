import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("[Database] WARNING: DATABASE_URL environment variable is not set. Database queries will fail.");
}

// Provide a dummy connection string to prevent neon() from throwing immediately on import 
// if the environment variable is missing (e.g., during some build steps or worker bootstraps).
// Queries will correctly fail at execution time.
const sql = neon(databaseUrl || "postgres://dummy:dummy@localhost/dummy");
export const db = drizzle(sql, { schema });
