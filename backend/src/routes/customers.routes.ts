import { Router, Response } from 'express';
import { customerService } from '../services/customer.service';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all customers
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { search, isActive, page, limit, sortBy, sortOrder } = req.query;

    const result = await customerService.findAll(req.user!.id, {
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result.customers,
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        total: result.total,
        totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 10)),
      },
    });
  })
);

// Get customer by ID
router.get(
  '/:id',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const customer = await customerService.findById(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: customer,
    });
  })
);

// Get customer statistics
router.get(
  '/:id/stats',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const stats = await customerService.getStats(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Create customer
router.post(
  '/',
  validate(schemas.createCustomer),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const customer = await customerService.create(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
    });
  })
);

// Update customer
router.put(
  '/:id',
  validate(schemas.updateCustomer),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const customer = await customerService.update(req.user!.id, req.params.id, req.body);

    res.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    });
  })
);

// Delete customer
router.delete(
  '/:id',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    await customerService.delete(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  })
);

export default router;
