import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from './errorHandler';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return next(new AppError(messages.join(', '), 400));
      }
      next(error);
    }
  };
};

// Validation schemas
export const schemas = {
  // Auth schemas
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      name: z.string().min(2, 'Name must be at least 2 characters'),
    }),
  }),

  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  // Customer schemas
  createCustomer: z.object({
    body: z.object({
      companyName: z.string().min(1, 'Company name is required'),
      contactName: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      vatId: z.string().optional(),
      customerNumber: z.string().optional(),
      notes: z.string().optional(),
    }),
  }),

  updateCustomer: z.object({
    params: z.object({
      id: z.string().uuid('Invalid customer ID'),
    }),
    body: z.object({
      companyName: z.string().min(1).optional(),
      contactName: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      vatId: z.string().optional(),
      customerNumber: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }),

  // Invoice schemas
  createInvoice: z.object({
    body: z.object({
      customerId: z.string().uuid('Invalid customer ID'),
      issueDate: z.string(),
      dueDate: z.string(),
      notes: z.string().optional(),
      paymentTerms: z.string().optional(),
      items: z.array(z.object({
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().positive('Quantity must be positive'),
        unit: z.string().optional(),
        unitPrice: z.number().min(0, 'Unit price must be non-negative'),
        taxRate: z.number().min(0).max(100).optional(),
      })).min(1, 'At least one item is required'),
    }),
  }),

  updateInvoice: z.object({
    params: z.object({
      id: z.string().uuid('Invalid invoice ID'),
    }),
    body: z.object({
      customerId: z.string().uuid().optional(),
      issueDate: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
      notes: z.string().optional(),
      paymentTerms: z.string().optional(),
      items: z.array(z.object({
        id: z.string().uuid().optional(),
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().optional(),
        unitPrice: z.number().min(0),
        taxRate: z.number().min(0).max(100).optional(),
      })).optional(),
    }),
  }),

  // Company schemas
  updateCompany: z.object({
    body: z.object({
      name: z.string().min(1).optional(),
      legalName: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      vatId: z.string().optional(),
      taxNumber: z.string().optional(),
      tradeRegister: z.string().optional(),
      court: z.string().optional(),
      managingDirector: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      website: z.string().optional(),
      bankName: z.string().optional(),
      iban: z.string().optional(),
      bic: z.string().optional(),
    }),
  }),

  // Settings schemas
  updateSettings: z.object({
    body: z.object({
      defaultTaxRate: z.number().min(0).max(100).optional(),
      defaultPaymentDays: z.number().int().positive().optional(),
      invoicePrefix: z.string().optional(),
      currency: z.string().length(3).optional(),
      language: z.string().optional(),
      emailNotifications: z.boolean().optional(),
    }),
  }),

  // Quote schemas
  createQuote: z.object({
    body: z.object({
      customerId: z.string().uuid('Invalid customer ID'),
      issueDate: z.string(),
      validUntil: z.string(),
      notes: z.string().optional(),
      termsConditions: z.string().optional(),
      items: z.array(z.object({
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().positive('Quantity must be positive'),
        unit: z.string().optional(),
        unitPrice: z.number().min(0, 'Unit price must be non-negative'),
        taxRate: z.number().min(0).max(100).optional(),
      })).min(1, 'At least one item is required'),
    }),
  }),

  updateQuote: z.object({
    params: z.object({
      id: z.string().uuid('Invalid quote ID'),
    }),
    body: z.object({
      customerId: z.string().uuid().optional(),
      issueDate: z.string().optional(),
      validUntil: z.string().optional(),
      notes: z.string().optional(),
      termsConditions: z.string().optional(),
      items: z.array(z.object({
        id: z.string().uuid().optional(),
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().optional(),
        unitPrice: z.number().min(0),
        taxRate: z.number().min(0).max(100).optional(),
      })).optional(),
    }),
  }),

  // Common schemas
  idParam: z.object({
    params: z.object({
      id: z.string().uuid('Invalid ID format'),
    }),
  }),

  pagination: z.object({
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
  }),
};
