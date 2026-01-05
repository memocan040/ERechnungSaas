import { Router, Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { zugferdService } from '../services/zugferd.service';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get invoice statistics
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const stats = await invoiceService.getStats(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get all invoices
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { search, status, customerId, startDate, endDate, page, limit, sortBy, sortOrder } = req.query;

    const result = await invoiceService.findAll(req.user!.id, {
      search: search as string,
      status: status as string,
      customerId: customerId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result.invoices,
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        total: result.total,
        totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 10)),
      },
    });
  })
);

// Get invoice by ID
router.get(
  '/:id',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await invoiceService.findById(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: invoice,
    });
  })
);

// Create invoice
router.post(
  '/',
  validate(schemas.createInvoice),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await invoiceService.create(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    });
  })
);

// Update invoice
router.put(
  '/:id',
  validate(schemas.updateInvoice),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await invoiceService.update(req.user!.id, req.params.id, req.body);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully',
    });
  })
);

// Update invoice status
router.patch(
  '/:id/status',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { status } = req.body;

    if (!['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const invoice = await invoiceService.updateStatus(req.user!.id, req.params.id, status);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice status updated successfully',
    });
  })
);

// Delete invoice
router.delete(
  '/:id',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    await invoiceService.delete(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  })
);

// Generate PDF
router.get(
  '/:id/pdf',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.findById(req.user!.id, req.params.id);
    const pdfBuffer = await zugferdService.generatePdf(req.user!.id, invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  })
);

// Generate ZUGFeRD XML
router.get(
  '/:id/xml',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.findById(req.user!.id, req.params.id);
    const xml = await zugferdService.generateXml(req.user!.id, invoice);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.xml"`);
    res.send(xml);
  })
);

export default router;
