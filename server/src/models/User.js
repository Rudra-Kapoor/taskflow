import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AVATAR_COLORS } from '../utils/constants.js';

const SALT_ROUNDS = 10;

const randomAvatarColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    title: { type: String, trim: true, maxlength: 80, default: '' },
    avatarColor: { type: String, default: randomAvatarColor },
    // Signed into every JWT (`ver`); incrementing it revokes all tokens issued before.
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
