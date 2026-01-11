import { Router, Response } from 'express';
import ledgerService from '../services/ledger.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// CHART OF ACCOUNTS ROUTES
// ============================================

// Get all accounts
router.get(
  '/accounts',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { accountType, accountClass, includeInactive, search } = req.query;

    const accounts = await ledgerService.getChartOfAccounts(req.user!.id, {
      accountType: accountType as string,
      accountClass: accountClass as string,
      includeInactive: includeInactive === 'true',
      search: search as string,
    });

    res.json({
      success: true,
      data: accounts,
    });
  })
);

// Get account by ID
router.get(
  '/accounts/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const account = await ledgerService.getAccount(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: account,
    });
  })
);

// Create new account
router.post(
  '/accounts',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const account = await ledgerService.createAccount(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: account,
      message: 'Account created successfully',
    });
  })
);

// Update account
router.put(
  '/accounts/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const account = await ledgerService.updateAccount(req.user!.id, req.params.id, req.body);

    res.json({
      success: true,
      data: account,
      message: 'Account updated successfully',
    });
  })
);

// Deactivate account
router.delete(
  '/accounts/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    await ledgerService.deactivateAccount(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  })
);

// Seed standard SKR03 accounts
router.post(
  '/accounts/seed',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { chartType } = req.body;
    const result = await ledgerService.seedStandardAccounts(
      req.user!.id,
      chartType || 'SKR03'
    );

    res.json({
      success: true,
      data: result,
      message: `Seeded ${result.created} accounts, skipped ${result.skipped} existing accounts`,
    });
  })
);

// Get account balance
router.get(
  '/accounts/:id/balance',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { asOfDate } = req.query;
    const date = asOfDate ? new Date(asOfDate as string) : undefined;

    const balance = await ledgerService.getAccountBalance(req.user!.id, req.params.id, date);

    res.json({
      success: true,
      data: { balance },
    });
  })
);

// ============================================
// JOURNAL ENTRY ROUTES
// ============================================

// Get all journal entries
router.get(
  '/journal-entries',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const {
      startDate,
      endDate,
      status,
      accountId,
      entryType,
      fiscalYear,
      fiscalPeriod,
      page,
      limit,
    } = req.query;

    const result = await ledgerService.getJournalEntries(req.user!.id, {
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
      accountId: accountId as string,
      entryType: entryType as string,
      fiscalYear: fiscalYear ? parseInt(fiscalYear as string, 10) : undefined,
      fiscalPeriod: fiscalPeriod ? parseInt(fiscalPeriod as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({
      success: true,
      data: result.entries,
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
        total: result.total,
        totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 50)),
      },
    });
  })
);

// Get journal entry by ID
router.get(
  '/journal-entries/:id',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const entry = await ledgerService.getJournalEntryById(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: entry,
    });
  })
);

// Create journal entry
router.post(
  '/journal-entries',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const entry = await ledgerService.createJournalEntry(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: entry,
      message: 'Journal entry created successfully',
    });
  })
);

// Post journal entry
router.post(
  '/journal-entries/:id/post',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const entry = await ledgerService.postJournalEntry(req.user!.id, req.params.id);

    res.json({
      success: true,
      data: entry,
      message: 'Journal entry posted successfully',
    });
  })
);

// Reverse journal entry
router.post(
  '/journal-entries/:id/reverse',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason for reversal is required',
      });
    }

    const entry = await ledgerService.reverseJournalEntry(req.user!.id, req.params.id, reason);

    res.json({
      success: true,
      data: entry,
      message: 'Journal entry reversed successfully',
    });
  })
);

// ============================================
// REPORTING ROUTES
// ============================================

// Get trial balance
router.get(
  '/trial-balance',
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    const { asOfDate } = req.query;

    if (!asOfDate) {
      return res.status(400).json({
        success: false,
        error: 'asOfDate parameter is required',
      });
    }

    const trialBalance = await ledgerService.getTrialBalance(
      req.user!.id,
      new Date(asOfDate as string)
    );

    res.json({
      success: true,
      data: trialBalance,
    });
  })
);

export default router;
