"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
class OtpService {
    constructor(db) {
        this.collectionName = 'otps';
        this.db = db;
    }
    // Create a new OTP
    async createOtp(email, code, expiresInMinutes = 5) {
        const codeHash = await bcrypt_1.default.hash(code, 10);
        const otp = {
            email,
            codeHash,
            expiresAt: new Date(Date.now() + expiresInMinutes * 60000),
            attempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.db.collection(this.collectionName).insertOne(otp);
        return otp;
    }
    // Find the latest OTP for an email
    async findOtp(email) {
        return this.db
            .collection(this.collectionName)
            .findOne({ email }, { sort: { createdAt: -1 } });
    }
    // Increment attempts count
    async incrementAttempts(email) {
        return this.db.collection(this.collectionName).updateOne({ email }, { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } });
    }
    // Delete all OTPs for an email
    async deleteOtp(email) {
        return this.db.collection(this.collectionName).deleteMany({ email });
    }
}
exports.OtpService = OtpService;
