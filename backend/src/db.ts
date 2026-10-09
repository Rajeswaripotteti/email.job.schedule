import { Pool } from "pg";

import "dotenv/config";
console.log("Database port:", process.env.DB_PORT);

const pool = new Pool
({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export default pool;