import { Schema, model } from 'mongoose';

export interface IUser {
  username: string;
  passwordHash: string;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
});

export const User = model<IUser>('User', UserSchema);
