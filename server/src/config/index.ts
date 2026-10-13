import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory or monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://stockflow:stockflow_secret@localhost:5433/stockflow_db?schema=public',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'stockflow_access_jwt_secret_key_production_grade_32chars_min',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'stockflow_refresh_jwt_secret_key_production_grade_32chars_min',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  uploadDir: path.resolve(process.cwd(), 'uploads'),
};
