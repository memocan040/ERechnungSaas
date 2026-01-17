import { Router, Response } from 'express';
import multer from 'multer';
import expenseService from '../services/expense.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/webp',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  },
});

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

// Upload receipt
router.post(
  '/:id/receipt',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const expense = await expenseService.uploadReceipt(
      req.user!.id,
      req.params.id,
      req.file
    );

    res.json({
      success: true,
      data: expense,
      message: 'Receipt uploaded successfully',
    });
  })
);

// Get receipt file
router.get(
  '/:id/receipt',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await expenseService.getExpenseById(req.user!.id, req.params.id);

    if (!expense.receiptUrl) {
      return res.status(404).json({
        success: false,
        error: 'No receipt associated with this expense',
      });
    }

    const fs = await import('fs');
    const path = await import('path');
    
    // The receiptUrl is relative (e.g., /uploads/receipts/file.pdf), remove leading slash for path.join
    const relativePath = expense.receiptUrl.startsWith('/') ? expense.receiptUrl.substring(1) : expense.receiptUrl;
    const absolutePath = path.join(process.cwd(), relativePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        error: 'Receipt file not found',
      });
    }

    const filename = path.basename(absolutePath);
    // Determine content type based on extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(absolutePath);
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
