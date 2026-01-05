import { Router, Response } from 'express';
import { reportService } from '../services/report.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard stats
router.get(
  '/dashboard',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const stats = await reportService.getDashboardStats(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get revenue by month
router.get(
  '/revenue/monthly',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { startDate, endDate } = req.query;

    const data = await reportService.getRevenueByMonth(
      req.user!.id,
      startDate || endDate ? {
        startDate: startDate as string,
        endDate: endDate as string,
      } : undefined
    );

    res.json({
      success: true,
      data,
    });
  })
);

// Get revenue by customer
router.get(
  '/revenue/customers',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { startDate, endDate, limit } = req.query;

    const data = await reportService.getRevenueByCustomer(
      req.user!.id,
      startDate || endDate ? {
        startDate: startDate as string,
        endDate: endDate as string,
      } : undefined,
      limit ? parseInt(limit as string, 10) : 10
    );

    res.json({
      success: true,
      data,
    });
  })
);

// Get tax summary
router.get(
  '/tax',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { startDate, endDate } = req.query;

    const data = await reportService.getTaxSummary(
      req.user!.id,
      startDate || endDate ? {
        startDate: startDate as string,
        endDate: endDate as string,
      } : undefined
    );

    res.json({
      success: true,
      data,
    });
  })
);

// Get invoice status summary
router.get(
  '/invoices/status',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { startDate, endDate } = req.query;

    const data = await reportService.getInvoiceStatusSummary(
      req.user!.id,
      startDate || endDate ? {
        startDate: startDate as string,
        endDate: endDate as string,
      } : undefined
    );

    res.json({
      success: true,
      data,
    });
  })
);

// Export revenue report as CSV
router.get(
  '/export/revenue',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;

    const data = await reportService.getRevenueByMonth(
      req.user!.id,
      startDate || endDate ? {
        startDate: startDate as string,
        endDate: endDate as string,
      } : undefined
    );

    const csv = await reportService.exportToCsv(
      data.map(d => ({ ...d })),
      ['month', 'revenue', 'invoiceCount']
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue-report.csv"');
    res.send(csv);
  })
);

// Export customer revenue as CSV
router.get(
  '/export/customers',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, limit } = req.query;

    const data = await reportService.getRevenueByCustomer(
      req.user!.id,
      startDate || endDate ? {
        startDate: startDate as string,
        endDate: endDate as string,
      } : undefined,
      limit ? parseInt(limit as string, 10) : 100
    );

    const csv = await reportService.exportToCsv(
      data.map(d => ({ ...d })),
      ['customerName', 'totalRevenue', 'invoiceCount', 'avgInvoiceValue']
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customer-revenue-report.csv"');
    res.send(csv);
  })
);

// Export tax summary as CSV
router.get(
  '/export/tax',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;

    const data = await reportService.getTaxSummary(
      req.user!.id,
      startDate || endDate ? {
        startDate: startDate as string,
        endDate: endDate as string,
      } : undefined
    );

    const csv = await reportService.exportToCsv(
      data.map(d => ({ ...d })),
      ['taxRate', 'netAmount', 'taxAmount', 'grossAmount']
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tax-report.csv"');
    res.send(csv);
  })
);

export default router;
