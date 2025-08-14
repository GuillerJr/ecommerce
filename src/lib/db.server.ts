
import { Pool, types } from 'pg';
import 'dotenv/config';

// Ensure environment variables are not set
if (!process.env.DB_HOST) {
    console.error("Database environment variables are not set. Please check your .env file.");
}

// Convert NUMERIC types from string to float. This fixes ".toFixed is not a function" errors.
types.setTypeParser(types.builtins.NUMERIC, (value: string) => {
    return parseFloat(value);
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'hktrickstore',
});

pool.on('connect', () => {
    console.log('🔗 Connected to the database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async <T>(text: string, params: any[] = []): Promise<T[]> => {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(text, params);
    // This simple conversion might not be robust enough for all cases.
    // A more comprehensive snake_case to camelCase converter might be needed.
    return res.rows as T[];
  } catch (error) {
    console.error('Error executing query', { text, params, error });
    throw error;
  } finally {
      if(client) {
          client.release();
      }
  }
};

export const getClient = () => {
  return pool.connect();
};

export const checkDbConnection = async () => {
    let client;
    try {
        client = await pool.connect();
        return { connected: true };
    } catch (error: any) {
        console.error("Database connection failed:", error.message);
        return { connected: false, error: error.message };
    } finally {
        if (client) {
            client.release();
        }
    }
};
