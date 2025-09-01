// db/otp.ts
import { Db } from 'mongodb';
import bcrypt from 'bcrypt';

// Define the OTP interface
export interface IOtp {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OtpService {
  private db: Db;
  private collectionName = 'otps';

  constructor(db: Db) {
    this.db = db;
  }

  // Create a new OTP
  async createOtp(email: string, code: string, expiresInMinutes = 5) {
    const codeHash = await bcrypt.hash(code, 10);
    const otp: IOtp = {
      email,
      codeHash,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60000),
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.collection<IOtp>(this.collectionName).insertOne(otp);
    return otp;
  }

  // Find the latest OTP for an email
  async findOtp(email: string) {
    return this.db
      .collection<IOtp>(this.collectionName)
      .findOne({ email }, { sort: { createdAt: -1 } });
  }

  // Increment attempts count
  async incrementAttempts(email: string) {
    return this.db.collection<IOtp>(this.collectionName).updateOne(
      { email },
      { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } }
    );
  }

  // Delete all OTPs for an email
  async deleteOtp(email: string) {
    return this.db.collection<IOtp>(this.collectionName).deleteMany({ email });
  }
}
