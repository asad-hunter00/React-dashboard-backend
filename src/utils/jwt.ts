import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserDto } from '../models/types.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateToken(user: UserDto): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  // Sign with configured secret and expiration
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (err) {
    return null;
  }
}
