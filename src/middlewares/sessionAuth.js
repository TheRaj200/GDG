import { v4 as uuidv4 } from 'uuid';
import { sessionRepository } from '../repositories/sessionRepository.js';

export async function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('kisan_')) {
    return null;
  }
  const session = await sessionRepository.findBySessionId(sessionId.trim());
  return session;
}

export async function sessionAuth(req, res, next) {
  try {
    const rawSessionId = req.headers['x-session-id'] || 
      (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);

    const isInitRoute = req.path === '/init' || req.path === '/session/init' || req.originalUrl?.includes('/session/init');

    if (rawSessionId) {
      const trimmed = String(rawSessionId).trim();
      const existing = await sessionRepository.findBySessionId(trimmed);
      if (existing) {
        req.sessionId = trimmed;
        res.setHeader('x-session-id', trimmed);
        return next();
      }
    }

    // If init route, issue new secure session
    if (isInitRoute) {
      const newSessionId = `kisan_${uuidv4()}`;
      await sessionRepository.createOrUpdate(newSessionId);
      req.sessionId = newSessionId;
      res.setHeader('x-session-id', newSessionId);
      return next();
    }

    // If no valid session for protected routes, return 401
    return res.status(401).json({
      success: false,
      error: 'Amanaya ya purana session token. Kripya naya session shuru karein.',
      requireInit: true,
    });
  } catch (err) {
    console.error('Session middleware error:', err);
    return res.status(500).json({ success: false, error: 'Session pramanikaran mein truti.' });
  }
}

