import http from 'http';
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initWebSocketProxy } from './services/voiceProxy.js';

const app = express();
const server = http.createServer(app);

// Trust proxy for Render / Vercel cloud deployments
app.set('trust proxy', 1);

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ENV.FRONTEND_ORIGIN === '*' || origin === ENV.FRONTEND_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy: Not allowed by CORS configuration.'));
      }
    },
    exposedHeaders: ['x-session-id'],
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount all API routes under /api
app.use('/api', apiRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    name: 'Kisan Ai API',
    description: 'Hinglish-first personal crop-planning & mandi selling voice/chat assistant for Indian farmers',
    health: '/api/health',
  });
});

// Centralized error handler
app.use(errorHandler);

// Attach WebSocket live voice proxy
initWebSocketProxy(server);

// Start server
const PORT = ENV.PORT || 5000;
const HOST = '0.0.0.0';

async function start() {
  await connectDB();
  server.listen(PORT, HOST, () => {
    console.log(`[Kisan Ai Backend] Running on http://${HOST}:${PORT}`);
  });
}

start();
