import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
  avatar?: string;
  provider: 'otp' | 'google';
  googleSub?: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  avatar: { type: String },
  provider: { type: String, enum: ['otp', 'google'], required: true },
  googleSub: { type: String }
}, { timestamps: true });

export default mongoose.model<IUser>('User', userSchema);
