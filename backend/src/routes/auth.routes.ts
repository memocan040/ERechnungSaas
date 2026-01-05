import { Router, Response } from 'express';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// Register
router.post(
  '/register',
  validate(schemas.register),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Registration successful',
    });
  })
);

// Login
router.post(
  '/login',
  validate(schemas.login),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  })
);

// Refresh token
router.post(
  '/refresh',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: result,
    });
  })
);

// Logout
router.post(
  '/logout',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

// Get current user
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    res.json({
      success: true,
      data: req.user,
    });
  })
);

// Change password
router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters',
      });
    }

    await authService.changePassword(req.user!.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

export default router;
