import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisan_ai',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  GEMINI_VOICE: process.env.GEMINI_VOICE || 'Aoede',
  GEMINI_LIVE_MODEL: process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || '*',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
