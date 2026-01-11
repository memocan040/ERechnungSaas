import { query } from '../config/database';
import {
  ChartOfAccount,
  CreateChartOfAccountData,
  UpdateChartOfAccountData,
  SKR03StandardAccount,
  JournalEntry,
  JournalEntryLine,
  CreateJournalEntryData,
  TrialBalance,
  TrialBalanceAccount,
  AccountingSettings,
  AccountType,
  AccountClass,
  JournalEntryType,
  JournalEntryStatus,
} from '../types';
import { AppError } from '../middleware/errorHandler';

interface ChartOfAccountFilters {
  accountType?: string;
  accountClass?: string;
  includeInactive?: boolean;
  search?: string;
}

interface JournalEntryFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  accountId?: string;
  entryType?: string;
  fiscalYear?: number;
  fiscalPeriod?: number;
  page?: number;
  limit?: number;
}

export class LedgerService {
  // ============================================
  // CHART OF ACCOUNTS METHODS
  // ============================================

  async getChartOfAccounts(
    userId: string,
    filters: ChartOfAccountFilters = {}
  ): Promise<ChartOfAccount[]> {
    const { accountType, accountClass, includeInactive = false, search = '' } = filters;

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (!includeInactive) {
      whereClause += ' AND is_active = true';
    }

    if (accountType) {
      whereClause += ` AND account_type = $${paramIndex}`;
      params.push(accountType);
      paramIndex++;
    }

    if (accountClass) {
      whereClause += ` AND account_class = $${paramIndex}`;
      params.push(accountClass);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (account_number ILIKE $${paramIndex} OR account_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(
      `SELECT * FROM chart_of_accounts
       ${whereClause}
       ORDER BY account_number ASC`,
      params
    );

    return result.rows.map(this.mapChartOfAccount);
  }

  async getAccount(userId: string, accountId: string): Promise<ChartOfAccount> {
    const result = await query(
      'SELECT * FROM chart_of_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Account not found', 404);
    }

    return this.mapChartOfAccount(result.rows[0]);
  }

  async getAccountByNumber(userId: string, accountNumber: string): Promise<ChartOfAccount | null> {
    const result = await query(
      'SELECT * FROM chart_of_accounts WHERE account_number = $1 AND user_id = $2',
      [accountNumber, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapChartOfAccount(result.rows[0]);
  }

  async createAccount(userId: string, data: CreateChartOfAccountData): Promise<ChartOfAccount> {
    // Check if account number already exists
    const existing = await this.getAccountByNumber(userId, data.accountNumber);
    if (existing) {
      throw new AppError(`Account number ${data.accountNumber} already exists`, 400);
    }

    const result = await query(
      `INSERT INTO chart_of_accounts (
        user_id, account_number, account_name, account_type, account_class,
        parent_account_id, tax_relevant, tax_code, auto_vat_account_id,
        description, datev_account_number, is_system_account
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
      RETURNING *`,
      [
        userId,
        data.accountNumber,
        data.accountName,
        data.accountType,
        data.accountClass,
        data.parentAccountId || null,
        data.taxRelevant || false,
        data.taxCode || null,
        data.autoVatAccountId || null,
        data.description || null,
        data.datevAccountNumber || null,
      ]
    );

    return this.mapChartOfAccount(result.rows[0]);
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: UpdateChartOfAccountData
  ): Promise<ChartOfAccount> {
    // Verify account exists and belongs to user
    await this.getAccount(userId, accountId);

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.accountName !== undefined) {
      updates.push(`account_name = $${paramIndex}`);
      params.push(data.accountName);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    params.push(accountId, userId);

    const result = await query(
      `UPDATE chart_of_accounts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    return this.mapChartOfAccount(result.rows[0]);
  }

  async deactivateAccount(userId: string, accountId: string): Promise<void> {
    // Check if account has any journal entry lines
    const usageCheck = await query(
      'SELECT COUNT(*) FROM journal_entry_lines WHERE account_id = $1',
      [accountId]
    );

    if (parseInt(usageCheck.rows[0].count, 10) > 0) {
      throw new AppError('Cannot deactivate account with existing transactions', 400);
    }

    await this.updateAccount(userId, accountId, { isActive: false });
  }

  async seedStandardAccounts(
    userId: string,
    chartType: 'SKR03' | 'SKR04' = 'SKR03'
  ): Promise<{ created: number; skipped: number }> {
    if (chartType !== 'SKR03') {
      throw new AppError('Only SKR03 is currently supported', 400);
    }

    // Get standard accounts
    const standardAccountsResult = await query(
      'SELECT * FROM skr03_standard_accounts ORDER BY account_number'
    );

    const standardAccounts: SKR03StandardAccount[] = standardAccountsResult.rows.map((row) => ({
      accountNumber: row.account_number,
      accountName: row.account_name,
      accountType: row.account_type,
      accountClass: row.account_class,
      taxCode: row.tax_code,
      description: row.description,
    }));

    let created = 0;
    let skipped = 0;

    for (const stdAccount of standardAccounts) {
      try {
        // Check if account already exists
        const existing = await this.getAccountByNumber(userId, stdAccount.accountNumber);
        if (existing) {
          skipped++;
          continue;
        }

        // Create account
        await query(
          `INSERT INTO chart_of_accounts (
            user_id, account_number, account_name, account_type, account_class,
            tax_relevant, tax_code, description, is_system_account
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [
            userId,
            stdAccount.accountNumber,
            stdAccount.accountName,
            stdAccount.accountType,
            stdAccount.accountClass,
            !!stdAccount.taxCode,
            stdAccount.taxCode,
            stdAccount.description,
          ]
        );

        created++;
      } catch (error) {
        console.error(`Error seeding account ${stdAccount.accountNumber}:`, error);
        skipped++;
      }
    }

    // Initialize accounting settings if not exists
    await this.initializeAccountingSettings(userId);

    return { created, skipped };
  }

  private async initializeAccountingSettings(userId: string): Promise<void> {
    // Check if settings already exist
    const existing = await query(
      'SELECT id FROM accounting_settings WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return;
    }

    // Create default settings
    await query(
      `INSERT INTO accounting_settings (user_id) VALUES ($1)`,
      [userId]
    );
  }

  // ============================================
  // JOURNAL ENTRY METHODS
  // ============================================

  async createJournalEntry(
    userId: string,
    data: CreateJournalEntryData
  ): Promise<JournalEntry> {
    // Validate the entry
    const validation = this.validateEntry(data);
    if (!validation.isValid) {
      throw new AppError(validation.error || 'Invalid journal entry', 400);
    }

    // Get next entry number
    const entryNumber = await this.getNextJournalEntryNumber(userId);

    // Determine fiscal year and period
    const entryDate = new Date(data.entryDate);
    const postingDate = data.postingDate ? new Date(data.postingDate) : entryDate;
    const fiscalYear = entryDate.getFullYear();
    const fiscalPeriod = entryDate.getMonth() + 1;

    // Begin transaction
    const client = await query('BEGIN');

    try {
      // Create journal entry header
      const entryResult = await query(
        `INSERT INTO journal_entries (
          user_id, entry_number, entry_date, posting_date,
          fiscal_year, fiscal_period, entry_type, status,
          description, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          userId,
          entryNumber,
          entryDate,
          postingDate,
          fiscalYear,
          fiscalPeriod,
          data.entryType,
          'draft',
          data.description,
          data.notes || null,
          userId,
        ]
      );

      const entryId = entryResult.rows[0].id;

      // Create journal entry lines
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];

        // Verify account exists
        await this.getAccount(userId, line.accountId);

        await query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_id,
            debit_amount, credit_amount, description,
            cost_center_id, tax_code, tax_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            entryId,
            i + 1,
            line.accountId,
            line.debitAmount,
            line.creditAmount,
            line.description || null,
            line.costCenterId || null,
            line.taxCode || null,
            line.taxAmount || 0,
          ]
        );
      }

      // Increment next entry number
      await query(
        `UPDATE accounting_settings
         SET next_journal_entry_number = next_journal_entry_number + 1
         WHERE user_id = $1`,
        [userId]
      );

      await query('COMMIT');

      // Fetch and return the complete entry
      return await this.getJournalEntryById(userId, entryId);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async getJournalEntries(
    userId: string,
    filters: JournalEntryFilters = {}
  ): Promise<{ entries: JournalEntry[]; total: number }> {
    const {
      startDate,
      endDate,
      status,
      accountId,
      entryType,
      fiscalYear,
      fiscalPeriod,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;
    const params: unknown[] = [userId];
    let whereClause = 'WHERE je.user_id = $1';
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND je.entry_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND je.entry_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND je.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (entryType) {
      whereClause += ` AND je.entry_type = $${paramIndex}`;
      params.push(entryType);
      paramIndex++;
    }

    if (fiscalYear) {
      whereClause += ` AND je.fiscal_year = $${paramIndex}`;
      params.push(fiscalYear);
      paramIndex++;
    }

    if (fiscalPeriod) {
      whereClause += ` AND je.fiscal_period = $${paramIndex}`;
      params.push(fiscalPeriod);
      paramIndex++;
    }

    if (accountId) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM journal_entry_lines jel
        WHERE jel.journal_entry_id = je.id AND jel.account_id = $${paramIndex}
      )`;
      params.push(accountId);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT je.id) FROM journal_entries je ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get entries
    params.push(limit, offset);
    const entriesResult = await query(
      `SELECT je.* FROM journal_entries je
       ${whereClause}
       ORDER BY je.entry_date DESC, je.entry_number DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    const entries: JournalEntry[] = [];
    for (const row of entriesResult.rows) {
      entries.push(await this.getJournalEntryById(userId, row.id));
    }

    return { entries, total };
  }

  async getJournalEntryById(userId: string, entryId: string): Promise<JournalEntry> {
    const entryResult = await query(
      'SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2',
      [entryId, userId]
    );

    if (entryResult.rows.length === 0) {
      throw new AppError('Journal entry not found', 404);
    }

    const entry = this.mapJournalEntry(entryResult.rows[0]);

    // Get lines
    const linesResult = await query(
      `SELECT jel.*, coa.account_number, coa.account_name
       FROM journal_entry_lines jel
       LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
       WHERE jel.journal_entry_id = $1
       ORDER BY jel.line_number`,
      [entryId]
    );

    entry.lines = linesResult.rows.map(this.mapJournalEntryLine);

    // Calculate totals
    entry.totalDebit = entry.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    entry.totalCredit = entry.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    entry.isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.01;

    return entry;
  }

  async postJournalEntry(userId: string, entryId: string): Promise<JournalEntry> {
    const entry = await this.getJournalEntryById(userId, entryId);

    if (entry.status === 'posted') {
      throw new AppError('Journal entry is already posted', 400);
    }

    if (entry.status === 'reversed') {
      throw new AppError('Cannot post a reversed journal entry', 400);
    }

    if (!entry.isBalanced) {
      throw new AppError('Journal entry is not balanced (debits ≠ credits)', 400);
    }

    const result = await query(
      `UPDATE journal_entries
       SET status = 'posted', posted_by = $1, posted_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $1
       RETURNING *`,
      [userId, entryId]
    );

    return await this.getJournalEntryById(userId, result.rows[0].id);
  }

  async reverseJournalEntry(
    userId: string,
    entryId: string,
    reason: string
  ): Promise<JournalEntry> {
    const originalEntry = await this.getJournalEntryById(userId, entryId);

    if (originalEntry.status !== 'posted') {
      throw new AppError('Only posted journal entries can be reversed', 400);
    }

    if (originalEntry.reversedBy) {
      throw new AppError('Journal entry has already been reversed', 400);
    }

    // Create reversal entry with swapped debits and credits
    const reversalLines = originalEntry.lines!.map((line) => ({
      accountId: line.accountId,
      debitAmount: line.creditAmount, // Swap
      creditAmount: line.debitAmount, // Swap
      description: line.description,
      costCenterId: line.costCenterId,
      taxCode: line.taxCode,
      taxAmount: -line.taxAmount,
    }));

    const reversalData: CreateJournalEntryData = {
      entryDate: new Date(),
      entryType: 'reversal',
      description: `Reversal of ${originalEntry.entryNumber}: ${reason}`,
      notes: `Reverses entry ${originalEntry.entryNumber}`,
      lines: reversalLines,
    };

    const reversalEntry = await this.createJournalEntry(userId, reversalData);
    await this.postJournalEntry(userId, reversalEntry.id);

    // Update original entry
    await query(
      `UPDATE journal_entries
       SET status = 'reversed', reversed_by = $1
       WHERE id = $2`,
      [reversalEntry.id, entryId]
    );

    // Update reversal entry
    await query(
      `UPDATE journal_entries
       SET reverses = $1
       WHERE id = $2`,
      [entryId, reversalEntry.id]
    );

    return await this.getJournalEntryById(userId, entryId);
  }

  // ============================================
  // BALANCE AND REPORTING METHODS
  // ============================================

  async getAccountBalance(
    userId: string,
    accountId: string,
    asOfDate?: Date
  ): Promise<number> {
    const account = await this.getAccount(userId, accountId);

    let dateFilter = '';
    const params: unknown[] = [accountId];

    if (asOfDate) {
      dateFilter = `AND je.entry_date <= $2 AND je.status = 'posted'`;
      params.push(asOfDate.toISOString().split('T')[0]);
    } else {
      dateFilter = `AND je.status = 'posted'`;
    }

    const result = await query(
      `SELECT
         COALESCE(SUM(jel.debit_amount), 0) as total_debit,
         COALESCE(SUM(jel.credit_amount), 0) as total_credit
       FROM journal_entry_lines jel
       JOIN journal_entries je ON jel.journal_entry_id = je.id
       WHERE jel.account_id = $1 ${dateFilter}`,
      params
    );

    const totalDebit = parseFloat(result.rows[0].total_debit);
    const totalCredit = parseFloat(result.rows[0].total_credit);

    // Calculate balance based on account type
    // Assets and Expenses: Debit balance (DR - CR)
    // Liabilities, Equity, Revenue: Credit balance (CR - DR)
    if (account.accountType === 'asset' || account.accountType === 'expense') {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  }

  async getTrialBalance(userId: string, asOfDate: Date): Promise<TrialBalance> {
    const accounts = await this.getChartOfAccounts(userId, { includeInactive: false });

    const trialBalanceAccounts: TrialBalanceAccount[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const result = await query(
        `SELECT
           COALESCE(SUM(jel.debit_amount), 0) as total_debit,
           COALESCE(SUM(jel.credit_amount), 0) as total_credit
         FROM journal_entry_lines jel
         JOIN journal_entries je ON jel.journal_entry_id = je.id
         WHERE jel.account_id = $1
           AND je.entry_date <= $2
           AND je.status = 'posted'`,
        [account.id, asOfDate.toISOString().split('T')[0]]
      );

      const accountDebit = parseFloat(result.rows[0].total_debit);
      const accountCredit = parseFloat(result.rows[0].total_credit);

      // Only include accounts with activity
      if (accountDebit > 0 || accountCredit > 0) {
        const balance = accountDebit - accountCredit;

        trialBalanceAccounts.push({
          accountId: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountType: account.accountType,
          totalDebit: accountDebit,
          totalCredit: accountCredit,
          balance,
        });

        totalDebits += accountDebit;
        totalCredits += accountCredit;
      }
    }

    return {
      asOfDate,
      accounts: trialBalanceAccounts,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  validateEntry(data: CreateJournalEntryData): { isValid: boolean; error?: string } {
    if (!data.lines || data.lines.length === 0) {
      return { isValid: false, error: 'Journal entry must have at least one line' };
    }

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of data.lines) {
      // Ensure only one of debit or credit is set
      if (line.debitAmount > 0 && line.creditAmount > 0) {
        return {
          isValid: false,
          error: 'Line cannot have both debit and credit amounts',
        };
      }

      if (line.debitAmount === 0 && line.creditAmount === 0) {
        return {
          isValid: false,
          error: 'Line must have either a debit or credit amount',
        };
      }

      totalDebit += line.debitAmount;
      totalCredit += line.creditAmount;
    }

    // Check if balanced (allow small floating point differences)
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      return {
        isValid: false,
        error: `Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`,
      };
    }

    return { isValid: true };
  }

  private async getNextJournalEntryNumber(userId: string): Promise<string> {
    const result = await query(
      'SELECT next_journal_entry_number FROM accounting_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      await this.initializeAccountingSettings(userId);
      return 'JE-00001';
    }

    const nextNumber = result.rows[0].next_journal_entry_number;
    return `JE-${String(nextNumber).padStart(5, '0')}`;
  }

  // ============================================
  // MAPPING METHODS
  // ============================================

  private mapChartOfAccount(row: unknown): ChartOfAccount {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      userId: r.user_id as string,
      accountNumber: r.account_number as string,
      accountName: r.account_name as string,
      accountType: r.account_type as AccountType,
      accountClass: r.account_class as AccountClass,
      parentAccountId: r.parent_account_id as string | undefined,
      taxRelevant: r.tax_relevant as boolean,
      taxCode: r.tax_code as string | undefined,
      autoVatAccountId: r.auto_vat_account_id as string | undefined,
      isSystemAccount: r.is_system_account as boolean,
      isActive: r.is_active as boolean,
      description: r.description as string | undefined,
      datevAccountNumber: r.datev_account_number as number | undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }

  private mapJournalEntry(row: unknown): JournalEntry {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      userId: r.user_id as string,
      entryNumber: r.entry_number as string,
      entryDate: new Date(r.entry_date as string),
      postingDate: new Date(r.posting_date as string),
      fiscalYear: r.fiscal_year as number,
      fiscalPeriod: r.fiscal_period as number,
      entryType: r.entry_type as JournalEntryType,
      status: r.status as JournalEntryStatus,
      referenceType: r.reference_type as string | undefined,
      referenceId: r.reference_id as string | undefined,
      description: r.description as string,
      notes: r.notes as string | undefined,
      reversedBy: r.reversed_by as string | undefined,
      reverses: r.reverses as string | undefined,
      createdBy: r.created_by as string | undefined,
      postedBy: r.posted_by as string | undefined,
      postedAt: r.posted_at ? new Date(r.posted_at as string) : undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }

  private mapJournalEntryLine(row: unknown): JournalEntryLine {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      journalEntryId: r.journal_entry_id as string,
      lineNumber: r.line_number as number,
      accountId: r.account_id as string,
      debitAmount: parseFloat(r.debit_amount as string),
      creditAmount: parseFloat(r.credit_amount as string),
      description: r.description as string | undefined,
      costCenterId: r.cost_center_id as string | undefined,
      taxCode: r.tax_code as string | undefined,
      taxAmount: parseFloat(r.tax_amount as string),
      createdAt: new Date(r.created_at as string),
      account: r.account_number
        ? {
          accountNumber: r.account_number as string,
          accountName: r.account_name as string,
        }
        : undefined,
    } as JournalEntryLine;
  }
}

export default new LedgerService();
