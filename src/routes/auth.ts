import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { Db } from 'mongodb';
import { sendOtpMail } from '../utils/mailer';

const router = Router();

// Schemas
const otpSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(6),
  name: z.string().min(1).optional(),
});

// JWT token issuance
function issueToken(user: any, res: any) {
  const token = jwt.sign(
    { email: user.email },
    process.env.JWT_SECRET as string,
    { subject: user._id.toString(), expiresIn: '7d' }
  );

  const secure = (process.env.COOKIE_SECURE || 'false') === 'true';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
}

// ========================
// REQUEST OTP
// ========================
router.post('/request-otp', async (req, res) => {
  try {
    const db: Db = req.app.locals.db;
    const { email } = otpSchema.parse(req.body);

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.collection('otps').updateOne(
      { email },
      { $set: { codeHash, expiresAt, attempts: 0 } },
      { upsert: true }
    );

    await sendOtpMail(email, code);
    res.json({ message: 'OTP sent' });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid request' });
  }
});

// ========================
// VERIFY OTP
// ========================
router.post('/verify-otp', async (req, res) => {
  try {
    const db: Db = req.app.locals.db;
    const { email, code, name } = verifySchema.parse(req.body);

    const record = await db.collection('otps').findOne({ email });
    if (!record) return res.status(400).json({ message: 'No OTP requested' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });

    const isValid = await bcrypt.compare(code, record.codeHash);
    if (!isValid) {
      await db.collection('otps').updateOne({ email }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // Check if user exists
    let user = await db.collection('users').findOne({ email });
    if (!user) {
      const result = await db.collection('users').insertOne({
        email,
        name,
        provider: 'otp',
        avatar: null,
      });
      user = { _id: result.insertedId, email, name, provider: 'otp', avatar: null };
    }

    await db.collection('otps').deleteOne({ email });
    issueToken(user, res);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Verification failed' });
  }
});

// ========================
// GOOGLE LOGIN
// ========================
router.post('/google', async (req, res) => {
  try {
    const db: Db = req.app.locals.db;
    const idToken: string = req.body.idToken;
    if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      if (!payload) throw new Error('Invalid token payload');
    } catch (err: any) {
      return res.status(400).json({ message: 'Google token verification failed: ' + err.message });
    }

    const email = payload.email as string;
    const sub = payload.sub as string;
    const name = payload.name;
    const picture = payload.picture;

    let user = await db.collection('users').findOne({ email });
    if (!user) {
      const result = await db.collection('users').insertOne({
        email,
        name,
        avatar: picture,
        provider: 'google',
        googleSub: sub,
      });
      user = { _id: result.insertedId, email, name, avatar: picture, provider: 'google' };
    } else if (user.provider !== 'google') {
      await db.collection('users').updateOne({ email }, { $set: { provider: 'google' } });
      user.provider = 'google';
    }

    issueToken(user, res);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Google login failed' });
  }
});

// ========================
// LOGOUT
// ========================
router.post('/logout', async (_req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out' });
});

export default router;
