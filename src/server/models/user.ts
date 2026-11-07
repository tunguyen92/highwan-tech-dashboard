import { type Model, model, models, Schema, type Types } from "mongoose";

import { ROLE, type Role } from "@/lib/wms/constants";

export type { Role };
export { ROLE };

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  name: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  tokenVersion: number; // Bump to invalidate every existing session of this user
  failedLoginCount: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLE), required: true },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);

UserSchema.index({ username: 1 }, { unique: true });

export const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);
