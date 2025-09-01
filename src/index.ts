// server.ts
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { MongoClient, Db } from 'mongodb';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth';
import notesRoutes from './routes/notes';

// Extend Express Request interface for user info
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

// JWT auth middleware
function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies['token'] || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

const app = express();

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS setup with credentials
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  })
);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// Main async function to connect to MongoDB
async function main() {
  try {
    const client = new MongoClient(process.env.MONGO_URI as string);
    await client.connect();
    const db: Db = client.db();
    app.locals.db = db;
    console.log('MongoDB connected');

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/notes', auth, notesRoutes);

    // Protected user info
    app.get('/api/me', auth, (req, res) => {
      res.json({ user: req.user });
    });

    // Root route
    app.get('/', (_req, res) => res.send('API is running'));

    const PORT = parseInt(process.env.PORT || '5174', 10);
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (err) {
    console.error('Server startup error', err);
    process.exit(1);
  }
}

// Start server
main();
