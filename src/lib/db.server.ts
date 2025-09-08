

import { Pool, types } from 'pg';
import 'dotenv/config';

// Asegurar que las variables de entorno no estén configuradas
if (!process.env.DB_HOST) {
    console.error("Las variables de entorno de la base de datos no están configuradas. Por favor, revisa tu archivo .env.");
}

// Convertir tipos NUMERIC de string a float. Esto soluciona errores de ".toFixed no es una función".
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
    console.log('🔗 Conectado a la base de datos');
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en un cliente inactivo', err);
  process.exit(-1);
});

export const query = async <T>(text: string, params: any[] = []): Promise<T[]> => {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(text, params);
    // Esta conversión simple podría no ser lo suficientemente robusta para todos los casos.
    // Podría ser necesario un conversor más completo de snake_case a camelCase.
    return res.rows as T[];
  } catch (error) {
    console.error('Error al ejecutar la consulta', { text, params, error });
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
        console.error("Falló la conexión a la base de datos:", error.message);
        return { connected: false, error: error.message };
    } finally {
        if (client) {
            client.release();
        }
    }
};
