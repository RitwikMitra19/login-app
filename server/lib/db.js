// import mysql from "mysql2/promise";

// let connection;

// export const connectToDatabase = async () => {
//   try {
//     if (!connection) {
//       connection = await mysql.createConnection({
//         host: process.env.DB_HOST,
//         user: process.env.DB_USER,
//         password: process.env.DB_PASSWORD,
//         database: process.env.DB_NAME,
//       });
//     }
//     return connection;
//   } catch (err) {
//     console.log(err);
//   }
// };

import pg from 'pg';
const { Pool } = pg;

let pool;

export const connectToDatabase = async () => {
  try {
    if (!pool) {
      pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432, // PostgreSQL default port
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
    }
    
    // Test the connection
    const client = await pool.connect();
    client.release();
    
    return pool;
  } catch (err) {
    console.log(err);
    throw err;
  }
};