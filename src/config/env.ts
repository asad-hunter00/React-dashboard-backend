import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'taskflow-default-jwt-secret-key-32-chars-long',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};
