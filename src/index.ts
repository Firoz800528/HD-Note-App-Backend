import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { MongoClient, Db } from 'mongodb';

import authRoutes from './routes/auth';
import notesRoutes from './routes/notes';
import { auth } from './middleware/auth';

const app = express();

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  })
);

// Health check endpoint
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// Main async function to connect to MongoDB and start the server
async function main() {
  try {
    const client = new MongoClient(process.env.MONGO_URI as string);
    await client.connect();
    const db: Db = client.db(); // default DB from URI
    app.locals.db = db;
    console.log('MongoDB connected');

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/notes', auth, notesRoutes);

    app.get('/api/me', auth, (req, res) => {
      res.json({ user: req.user });
    });

    // Root
    app.get('/', (_req, res) => {
      res.send('API is running');
    });

    const PORT = parseInt(process.env.PORT || '5174', 10);
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (err) {
    console.error('Server startup error', err);
    process.exit(1);
  }
}

// Start the server
main();