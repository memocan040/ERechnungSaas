import { Router } from 'express';
import authRoutes from './auth.routes';
import customersRoutes from './customers.routes';
import invoicesRoutes from './invoices.routes';
import companyRoutes from './company.routes';
import reportsRoutes from './reports.routes';
import settingsRoutes from './settings.routes';
import accountingRoutes from './accounting.routes';
import expensesRoutes from './expenses.routes';
import vendorsRoutes from './vendors.routes';
import { notFound } from '../middleware/errorHandler';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/customers', customersRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/company', companyRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/accounting', accountingRoutes);
router.use('/expenses', expensesRoutes);
router.use('/vendors', vendorsRoutes);

// 404 handler for API routes
router.use(notFound);

export default router;
