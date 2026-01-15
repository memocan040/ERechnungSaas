import { Router, Response } from 'express';
import { quoteService } from '../services/quote.service';
import { quotePdfService } from '../services/quote-pdf.service';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get quote statistics
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const stats = await quoteService.getStats(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get all quotes
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { search, status, customerId, startDate, endDate, page, limit, sortBy, sortOrder } = req.query;

    const result = await quoteService.findAll(req.user!.id, {
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
      data: result.quotes,
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        total: result.total,
        totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 10)),
      },
    });
  })
);

// Get quote by ID
router.get(
  '/:id',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const quote = await quoteService.findById(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: quote,
    });
  })
);

// Create quote
router.post(
  '/',
  validate(schemas.createQuote),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const quote = await quoteService.create(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: quote,
      message: 'Angebot erfolgreich erstellt',
    });
  })
);

// Update quote
router.put(
  '/:id',
  validate(schemas.updateQuote),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const quote = await quoteService.update(req.user!.id, req.params.id, req.body);

    res.json({
      success: true,
      data: quote,
      message: 'Angebot erfolgreich aktualisiert',
    });
  })
);

// Update quote status
router.patch(
  '/:id/status',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { status } = req.body;

    if (!['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const quote = await quoteService.updateStatus(req.user!.id, req.params.id, status);

    res.json({
      success: true,
      data: quote,
      message: 'Angebotsstatus erfolgreich aktualisiert',
    });
  })
);

// Convert quote to invoice
router.post(
  '/:id/convert',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const result = await quoteService.convertToInvoice(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: result,
      message: 'Angebot erfolgreich in Rechnung umgewandelt',
    });
  })
);

// Delete quote
router.delete(
  '/:id',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    await quoteService.delete(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Angebot erfolgreich gelöscht',
    });
  })
);

// Generate PDF
router.get(
  '/:id/pdf',
  validate(schemas.idParam),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const quote = await quoteService.findById(req.user!.id, req.params.id);
    const pdfBuffer = await quotePdfService.generatePdf(req.user!.id, quote);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.quoteNumber}.pdf"`);
    res.send(pdfBuffer);
  })
);

export default router;
