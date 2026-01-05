import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { User, TokenPayload } from '../types';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

export class AuthService {
  async register(email: string, password: string, name: string): Promise<{ user: Partial<User>; accessToken: string; refreshToken: string }> {
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];

    // Create default settings for user
    await query(
      `INSERT INTO user_settings (user_id) VALUES ($1)`,
      [user.id]
    );

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string): Promise<{ user: Partial<User>; accessToken: string; refreshToken: string }> {
    // Find user
    const result = await query(
      'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError('Account is disabled', 403);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find valid session
    const sessionResult = await query(
      `SELECT s.*, u.id as user_id, u.email, u.name, u.role, u.is_active
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.refresh_token = $1 AND s.expires_at > NOW()`,
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const session = sessionResult.rows[0];

    if (!session.is_active) {
      throw new AppError('Account is disabled', 403);
    }

    // Delete old session
    await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(session);
    const newRefreshToken = await this.generateRefreshToken(session.user_id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
  }

  async logoutAll(userId: string): Promise<void> {
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

    // Invalidate all sessions
    await this.logoutAll(userId);
  }

  private generateAccessToken(user: { id: string; email: string; role: string }): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
    return jwt.sign(payload, JWT_SECRET, options);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

    await query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [userId, refreshToken, expiresAt]
    );

    return refreshToken;
  }
}

export const authService = new AuthService();
