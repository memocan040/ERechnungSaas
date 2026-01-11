import { Router, Response } from 'express';
import expenseService from '../services/expense.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all expenses
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const {
      search,
      status,
      vendorId,
      categoryId,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const result = await expenseService.getExpenses(req.user!.id, {
      search: search as string,
      status: status as string,
      vendorId: vendorId as string,
      categoryId: categoryId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      data: result.expenses,
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        total: result.total,
        totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 10)),
      },
    });
  })
);

// Get expense by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const expense = await expenseService.getExpenseById(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: expense,
    });
  })
);

// Create expense
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const expense = await expenseService.createExpense(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    });
  })
);

// Update expense
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const expense = await expenseService.updateExpense(req.user!.id, req.params.id, req.body);

    res.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully',
    });
  })
);

// Update expense status
router.patch(
  '/:id/status',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const expense = await expenseService.updateExpenseStatus(
      req.user!.id,
      req.params.id,
      status
    );

    res.json({
      success: true,
      data: expense,
      message: 'Expense status updated successfully',
    });
  })
);

// Delete expense
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    await expenseService.deleteExpense(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  })
);

// Get expense categories
router.get(
  '/categories/all',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const categories = await expenseService.getCategories(req.user!.id);

    res.json({
      success: true,
      data: categories,
    });
  })
);

// Create expense category
router.post(
  '/categories',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { name, description, defaultAccountId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const category = await expenseService.createCategory(
      req.user!.id,
      name,
      description,
      defaultAccountId
    );

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  })
);

// Get cost centers
router.get(
  '/cost-centers/all',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const costCenters = await expenseService.getCostCenters(req.user!.id);

    res.json({
      success: true,
      data: costCenters,
    });
  })
);

// Create cost center
router.post(
  '/cost-centers',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Code and name are required',
      });
    }

    const costCenter = await expenseService.createCostCenter(
      req.user!.id,
      code,
      name,
      description
    );

    res.status(201).json({
      success: true,
      data: costCenter,
      message: 'Cost center created successfully',
    });
  })
);

export default router;
