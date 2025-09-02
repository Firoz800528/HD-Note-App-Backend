"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpMail = sendOtpMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
async function sendOtpMail(to, code) {
    const transporter = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT || '587') === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to,
            subject: 'Your OTP Code',
            text: `Your OTP is ${code}. It will expire in 5 minutes.`,
        });
        console.log('OTP sent:', info.messageId);
    }
    catch (err) {
        console.error('Failed to send OTP:', err.message);
    }
}
