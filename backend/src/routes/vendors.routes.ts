import { Router, Response } from 'express';
import expenseService from '../services/expense.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all vendors
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const {
      search,
      isActive,
      country,
      page,
      limit,
    } = req.query;

    const result = await expenseService.getVendors(req.user!.id, {
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      country: country as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      data: result.vendors,
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        total: result.total,
        totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 10)),
      },
    });
  })
);

// Get vendor by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const vendor = await expenseService.getVendorById(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: vendor,
    });
  })
);

// Create vendor
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const vendor = await expenseService.createVendor(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: vendor,
      message: 'Vendor created successfully',
    });
  })
);

// Update vendor
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const vendor = await expenseService.updateVendor(req.user!.id, req.params.id, req.body);

    res.json({
      success: true,
      data: vendor,
      message: 'Vendor updated successfully',
    });
  })
);

// Delete vendor
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    await expenseService.deleteVendor(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Vendor deleted successfully',
    });
  })
);

export default router;
