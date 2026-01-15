import { Router, Response } from 'express';
import { invoiceDesignService } from '../services/invoice-design.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const settings = await invoiceDesignService.findByUserId(req.user!.id);

    res.json({
      success: true,
      data: settings,
    });
  })
);

router.get(
  '/templates',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const templates = invoiceDesignService.getTemplatePresets();

    res.json({
      success: true,
      data: templates,
    });
  })
);

router.post(
  '/templates/:templateName',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const settings = await invoiceDesignService.applyTemplate(
      req.user!.id,
      req.params.templateName
    );

    res.json({
      success: true,
      data: settings,
      message: 'Template applied successfully',
    });
  })
);

router.put(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const settings = await invoiceDesignService.createOrUpdate(
      req.user!.id,
      req.body
    );

    res.json({
      success: true,
      data: settings,
      message: 'Design settings updated successfully',
    });
  })
);

export default router;
