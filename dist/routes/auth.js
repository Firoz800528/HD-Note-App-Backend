"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const google_auth_library_1 = require("google-auth-library");
const mailer_1 = require("../utils/mailer");
const router = (0, express_1.Router)();
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Schemas
const otpSchema = zod_1.z.object({ email: zod_1.z.string().email() });
const verifySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().min(6).max(6),
    name: zod_1.z.string().optional(),
});
// Issue JWT token
function issueToken(user, res) {
    const token = jsonwebtoken_1.default.sign({ email: user.email }, process.env.JWT_SECRET, {
        subject: user._id.toString(),
        expiresIn: '7d',
    });
    const secure = (process.env.COOKIE_SECURE || 'false') === 'true';
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return token;
}
// ========================
// REQUEST OTP
// ========================
router.post('/request-otp', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { email } = otpSchema.parse(req.body);
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const codeHash = await bcryptjs_1.default.hash(code, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await db.collection('otps').updateOne({ email }, { $set: { codeHash, expiresAt, attempts: 0 } }, { upsert: true });
        await (0, mailer_1.sendOtpMail)(email, code);
        res.json({ message: 'OTP sent' });
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid request' });
    }
});
// ========================
// VERIFY OTP
// ========================
router.post('/verify-otp', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { email, code, name } = verifySchema.parse(req.body);
        const record = await db.collection('otps').findOne({ email });
        if (!record)
            return res.status(400).json({ message: 'No OTP requested' });
        if (record.expiresAt < new Date())
            return res.status(400).json({ message: 'OTP expired' });
        const isValid = await bcryptjs_1.default.compare(code, record.codeHash);
        if (!isValid) {
            await db.collection('otps').updateOne({ email }, { $inc: { attempts: 1 } });
            return res.status(400).json({ message: 'Incorrect OTP' });
        }
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
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Verification failed' });
    }
});
// ========================
// GOOGLE AUTH (without Firebase)
// ========================
router.post('/google', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Missing Google token' });
        }
        // Verify the Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ message: 'Invalid Google token' });
        }
        const { email, name, picture, sub: googleId } = payload;
        // Check if user exists in DB
        let user = await db.collection('users').findOne({ email });
        if (!user) {
            // Create new user
            const result = await db.collection('users').insertOne({
                googleId,
                email,
                name,
                avatar: picture,
                provider: 'google',
                createdAt: new Date(),
            });
            user = {
                _id: result.insertedId,
                googleId,
                email,
                name,
                avatar: picture,
                provider: 'google'
            };
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
    }
    catch (err) {
        console.error('Google auth error:', err);
        res.status(400).json({ message: err.message || 'Google authentication failed' });
    }
});
// ========================
// LOGOUT
// ========================
router.post('/logout', async (_req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Logged out' });
});
exports.default = router;
