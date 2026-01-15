import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';
import xmlImportService from '../services/xml-import.service';

const router = Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Check file extension
    if (!file.originalname.toLowerCase().endsWith('.xml')) {
      cb(new AppError('Only XML files are allowed', 400));
      return;
    }
    // Check MIME type
    if (file.mimetype !== 'text/xml' && file.mimetype !== 'application/xml') {
      cb(new AppError('Invalid file type', 400));
      return;
    }
    cb(null, true);
  },
});

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/invoices/import/parse
 * Parse XML file and return preview data with validation
 */
router.post(
  '/parse',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Convert buffer to string
    const xmlContent = req.file.buffer.toString('utf-8');

    // Parse and validate XML
    const parsedData = await xmlImportService.parseXml(req.user!.id, xmlContent);

    res.json({
      success: true,
      data: parsedData,
      message: parsedData.validation.isValid
        ? 'XML erfolgreich geparst'
        : 'XML enthält Validierungsfehler',
    });
  })
);

/**
 * POST /api/invoices/import/execute
 * Execute the import and create invoice + customer
 */
router.post(
  '/execute',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { xmlContent, parsedData } = req.body;

    if (!xmlContent) {
      throw new AppError('XML content is required', 400);
    }

    // Execute import
    const result = await xmlImportService.executeImport(
      req.user!.id,
      xmlContent,
      parsedData
    );

    if (!result.success) {
      throw new AppError(result.error || 'Import failed', 400);
    }

    res.json({
      success: true,
      data: {
        invoice: result.invoice,
        customer: result.customer,
      },
      message: 'Rechnung erfolgreich importiert',
    });
  })
);

export default router;
