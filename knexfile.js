import dotenv from 'dotenv';

dotenv.config();

const knexConfig = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.db'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};

export default knexConfig;