import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

function redactUri(uri) {
  if (!uri) return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/, '$1***$3');
}

export async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${redactUri(ENV.MONGODB_URI)}: ${error.message}. (Using in-memory repository cache if DB unavailable)`);
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

