import { Router, Response } from 'express';
import multer from 'multer';
import incomingInvoiceService from '../services/incoming-invoice.service';
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

// Get statistics
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const stats = await incomingInvoiceService.getStats(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get all incoming invoices
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

    const result = await incomingInvoiceService.findAll(req.user!.id, {
      search: search as string,
      status: status as any,
      vendorId: vendorId as string,
      categoryId: categoryId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
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

// Get incoming invoice by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await incomingInvoiceService.findById(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: invoice,
    });
  })
);

// Upload file and create invoice with OCR
router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const result = await incomingInvoiceService.createFromUpload(req.user!.id, req.file);

    res.status(201).json({
      success: true,
      data: {
        invoice: result.invoice,
        ocrResult: {
          confidence: result.ocrResult.confidence,
          extractedData: result.ocrResult.extractedData,
        },
      },
      message: 'File uploaded and processed successfully',
    });
  })
);

// Create incoming invoice manually
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await incomingInvoiceService.create(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Incoming invoice created successfully',
    });
  })
);

// Update incoming invoice
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await incomingInvoiceService.update(req.user!.id, req.params.id, req.body);

    res.json({
      success: true,
      data: invoice,
      message: 'Incoming invoice updated successfully',
    });
  })
);

// Update status
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

    const invoice = await incomingInvoiceService.updateStatus(
      req.user!.id,
      req.params.id,
      status
    );

    res.json({
      success: true,
      data: invoice,
      message: 'Status updated successfully',
    });
  })
);

// Book invoice (create journal entry)
router.post(
  '/:id/book',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await incomingInvoiceService.bookInvoice(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice booked successfully',
    });
  })
);

// Mark as paid
router.post(
  '/:id/mark-paid',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const invoice = await incomingInvoiceService.markAsPaid(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice marked as paid',
    });
  })
);

// Generate and download XML
router.get(
  '/:id/xml',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const xml = await incomingInvoiceService.generateXml(req.user!.id, req.params.id);
    const invoice = await incomingInvoiceService.findById(req.user!.id, req.params.id);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}_zugferd.xml"`
    );
    res.send(xml);
  })
);

// Get file/document
router.get(
  '/:id/file',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await incomingInvoiceService.findById(req.user!.id, req.params.id);

    if (!invoice.filePath) {
      return res.status(404).json({
        success: false,
        error: 'No file associated with this invoice',
      });
    }

    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(invoice.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    const filename = invoice.originalFilename || path.basename(invoice.filePath);
    res.setHeader('Content-Type', invoice.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(invoice.filePath);
  })
);

// Delete incoming invoice
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    await incomingInvoiceService.delete(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Incoming invoice deleted successfully',
    });
  })
);

export default router;
