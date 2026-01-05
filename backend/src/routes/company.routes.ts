import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { companyService } from '../services/company.service';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/logos');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Get company
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const company = await companyService.findByUserId(req.user!.id);

    res.json({
      success: true,
      data: company,
    });
  })
);

// Create or update company
router.put(
  '/',
  validate(schemas.updateCompany),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const company = await companyService.createOrUpdate(req.user!.id, req.body);

    res.json({
      success: true,
      data: company,
      message: 'Company updated successfully',
    });
  })
);

// Upload logo
router.post(
  '/logo',
  upload.single('logo'),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const company = await companyService.updateLogo(req.user!.id, logoUrl);

    res.json({
      success: true,
      data: company,
      message: 'Logo uploaded successfully',
    });
  })
);

export default router;
