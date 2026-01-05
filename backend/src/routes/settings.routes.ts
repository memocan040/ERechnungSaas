import { Router, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get settings
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const settings = await settingsService.findByUserId(req.user!.id);

    res.json({
      success: true,
      data: settings,
    });
  })
);

// Update settings
router.put(
  '/',
  validate(schemas.updateSettings),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const settings = await settingsService.createOrUpdate(req.user!.id, req.body);

    res.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  })
);

// Get next invoice number preview
router.get(
  '/next-invoice-number',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const nextNumber = await settingsService.getNextInvoiceNumber(req.user!.id);

    res.json({
      success: true,
      data: { nextInvoiceNumber: nextNumber },
    });
  })
);

export default router;
