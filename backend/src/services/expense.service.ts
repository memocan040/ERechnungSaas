import { query } from '../config/database';
import ledgerService from './ledger.service';
import {
  Vendor,
  CreateVendorData,
  UpdateVendorData,
  Expense,
  ExpenseItem,
  CreateExpenseData,
  UpdateExpenseData,
  ExpenseCategory,
  CostCenter,
  CreateJournalEntryData,
  JournalEntryLine,
} from '../types';
import { AppError } from '../middleware/errorHandler';

interface VendorFilters {
  search?: string;
  isActive?: boolean;
  country?: string;
  page?: number;
  limit?: number;
}

interface ExpenseFilters {
  search?: string;
  status?: string;
  vendorId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class ExpenseService {
  // ============================================
  // VENDOR METHODS
  // ============================================

  async getVendors(
    userId: string,
    filters: VendorFilters = {}
  ): Promise<{ vendors: Vendor[]; total: number }> {
    const { search = '', isActive, page = 1, limit = 10 } = filters;

    const offset = (page - 1) * limit;
    const params: unknown[] = [userId];
    let whereClause = 'WHERE user_id = $1';
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (vendor_number ILIKE $${paramIndex} OR company_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM vendors ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get vendors
    params.push(limit, offset);
    const vendorsResult = await query(
      `SELECT * FROM vendors
       ${whereClause}
       ORDER BY company_name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    const vendors = vendorsResult.rows.map(this.mapVendor);

    return { vendors, total };
  }

  async getVendorById(userId: string, vendorId: string): Promise<Vendor> {
    const result = await query(
      'SELECT * FROM vendors WHERE id = $1 AND user_id = $2',
      [vendorId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Vendor not found', 404);
    }

    return this.mapVendor(result.rows[0]);
  }

  async createVendor(userId: string, data: CreateVendorData): Promise<Vendor> {
    // Get next vendor number if not provided
    const vendorNumber = data.vendorNumber || await this.getNextVendorNumber(userId);

    const result = await query(
      `INSERT INTO vendors (
        user_id, vendor_number, company_name, contact_name,
        email, phone, street, house_number, postal_code, city,
        country, vat_id, tax_number, iban, bic,
        payment_terms, default_payment_method, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        userId,
        vendorNumber,
        data.companyName,
        data.contactName || null,
        data.email || null,
        data.phone || null,
        data.street || null,
        data.houseNumber || null,
        data.postalCode || null,
        data.city || null,
        data.country || 'Deutschland',
        data.vatId || null,
        data.taxNumber || null,
        data.iban || null,
        data.bic || null,
        data.paymentTerms || null,
        data.defaultPaymentMethod || 'bank_transfer',
        data.notes || null,
      ]
    );

    return this.mapVendor(result.rows[0]);
  }

  async updateVendor(
    userId: string,
    vendorId: string,
    data: UpdateVendorData
  ): Promise<Vendor> {
    // Verify vendor exists
    await this.getVendorById(userId, vendorId);

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'companyName', 'contactName', 'email', 'phone', 'street', 'houseNumber',
      'postalCode', 'city', 'country', 'vatId', 'taxNumber', 'iban', 'bic',
      'paymentTerms', 'defaultPaymentMethod', 'isActive', 'notes'
    ];

    fields.forEach((field) => {
      const dbField = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if ((data as any)[field] !== undefined) {
        updates.push(`${dbField} = $${paramIndex}`);
        params.push((data as any)[field]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    params.push(vendorId, userId);

    const result = await query(
      `UPDATE vendors
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    return this.mapVendor(result.rows[0]);
  }

  async deleteVendor(userId: string, vendorId: string): Promise<void> {
    // Check if vendor has expenses
    const expensesCheck = await query(
      'SELECT COUNT(*) FROM expenses WHERE vendor_id = $1',
      [vendorId]
    );

    if (parseInt(expensesCheck.rows[0].count, 10) > 0) {
      throw new AppError('Cannot delete vendor with existing expenses', 400);
    }

    const result = await query(
      'DELETE FROM vendors WHERE id = $1 AND user_id = $2',
      [vendorId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Vendor not found', 404);
    }
  }

  private async getNextVendorNumber(userId: string): Promise<string> {
    const result = await query(
      `SELECT vendor_number FROM vendors
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return 'V-0001';
    }

    const lastNumber = result.rows[0].vendor_number;
    const match = lastNumber.match(/V-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `V-${String(nextNum).padStart(4, '0')}`;
    }

    return 'V-0001';
  }

  // ============================================
  // EXPENSE METHODS
  // ============================================

  async getExpenses(
    userId: string,
    filters: ExpenseFilters = {}
  ): Promise<{ expenses: Expense[]; total: number }> {
    const {
      search = '',
      status,
      vendorId,
      categoryId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;
    const params: unknown[] = [userId];
    let whereClause = 'WHERE e.user_id = $1';
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (e.expense_number ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR v.company_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendorId) {
      whereClause += ` AND e.vendor_id = $${paramIndex}`;
      params.push(vendorId);
      paramIndex++;
    }

    if (categoryId) {
      whereClause += ` AND e.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND e.expense_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND e.expense_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM expenses e
       LEFT JOIN vendors v ON e.vendor_id = v.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get expenses
    params.push(limit, offset);
    const expensesResult = await query(
      `SELECT e.*, v.company_name as vendor_name
       FROM expenses e
       LEFT JOIN vendors v ON e.vendor_id = v.id
       ${whereClause}
       ORDER BY e.expense_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    // Map expenses first
    const expenses: Expense[] = expensesResult.rows.map((row) => this.mapExpense(row));

    // Get all expense IDs
    const expenseIds = expenses.map((e) => e.id);

    // Fetch all items in a single query (fixes N+1 problem)
    if (expenseIds.length > 0) {
      const itemsResult = await query(
        `SELECT * FROM expense_items
         WHERE expense_id = ANY($1)
         ORDER BY expense_id, position`,
        [expenseIds]
      );

      // Group items by expense_id
      const itemsByExpenseId = new Map<string, ExpenseItem[]>();
      for (const row of itemsResult.rows) {
        const item = this.mapExpenseItem(row);
        const existing = itemsByExpenseId.get(row.expense_id) || [];
        existing.push(item);
        itemsByExpenseId.set(row.expense_id, existing);
      }

      // Assign items to expenses
      for (const expense of expenses) {
        expense.items = itemsByExpenseId.get(expense.id) || [];
      }
    } else {
      // No expenses, no items
      for (const expense of expenses) {
        expense.items = [];
      }
    }

    return { expenses, total };
  }

  async getExpenseById(userId: string, expenseId: string): Promise<Expense> {
    const result = await query(
      `SELECT e.*, v.company_name as vendor_name
       FROM expenses e
       LEFT JOIN vendors v ON e.vendor_id = v.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [expenseId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Expense not found', 404);
    }

    const expense = this.mapExpense(result.rows[0]);

    // Get items
    const itemsResult = await query(
      'SELECT * FROM expense_items WHERE expense_id = $1 ORDER BY position',
      [expenseId]
    );
    expense.items = itemsResult.rows.map(this.mapExpenseItem);

    return expense;
  }

  async createExpense(userId: string, data: CreateExpenseData): Promise<Expense> {
    // Get next expense number
    const expenseNumber = await this.getNextExpenseNumber(userId);

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    let total = 0;

    data.items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTaxAmount = itemSubtotal * ((item.taxRate || 19) / 100);
      const itemTotal = itemSubtotal + itemTaxAmount;

      subtotal += itemSubtotal;
      taxAmount += itemTaxAmount;
      total += itemTotal;
    });

    // Begin transaction
    await query('BEGIN');

    try {
      // Create expense
      const expenseResult = await query(
        `INSERT INTO expenses (
          user_id, vendor_id, expense_number, vendor_invoice_number,
          expense_date, due_date, category_id, cost_center_id,
          description, subtotal, tax_amount, total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          userId,
          data.vendorId || null,
          expenseNumber,
          data.vendorInvoiceNumber || null,
          data.expenseDate,
          data.dueDate || null,
          data.categoryId || null,
          data.costCenterId || null,
          data.description,
          subtotal,
          taxAmount,
          total,
          data.notes || null,
        ]
      );

      const expenseId = expenseResult.rows[0].id;

      // Create expense items
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTaxAmount = itemSubtotal * ((item.taxRate || 19) / 100);
        const itemTotal = itemSubtotal + itemTaxAmount;

        await query(
          `INSERT INTO expense_items (
            expense_id, position, description, quantity, unit_price,
            tax_rate, account_id, cost_center_id,
            subtotal, tax_amount, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            expenseId,
            i + 1,
            item.description,
            item.quantity,
            item.unitPrice,
            item.taxRate || 19,
            item.accountId || null,
            item.costCenterId || null,
            itemSubtotal,
            itemTaxAmount,
            itemTotal,
          ]
        );
      }

      await query('COMMIT');

      return await this.getExpenseById(userId, expenseId);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async updateExpense(
    userId: string,
    expenseId: string,
    data: UpdateExpenseData
  ): Promise<Expense> {
    // Verify expense exists and is still a draft
    const expense = await this.getExpenseById(userId, expenseId);

    if (expense.status !== 'draft') {
      throw new AppError('Only draft expenses can be updated', 400);
    }

    await query('BEGIN');

    try {
      // Update expense header
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (data.vendorId !== undefined) {
        updates.push(`vendor_id = $${paramIndex}`);
        params.push(data.vendorId);
        paramIndex++;
      }

      if (data.vendorInvoiceNumber !== undefined) {
        updates.push(`vendor_invoice_number = $${paramIndex}`);
        params.push(data.vendorInvoiceNumber);
        paramIndex++;
      }

      if (data.expenseDate) {
        updates.push(`expense_date = $${paramIndex}`);
        params.push(data.expenseDate);
        paramIndex++;
      }

      if (data.dueDate !== undefined) {
        updates.push(`due_date = $${paramIndex}`);
        params.push(data.dueDate);
        paramIndex++;
      }

      if (data.categoryId !== undefined) {
        updates.push(`category_id = $${paramIndex}`);
        params.push(data.categoryId);
        paramIndex++;
      }

      if (data.costCenterId !== undefined) {
        updates.push(`cost_center_id = $${paramIndex}`);
        params.push(data.costCenterId);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        params.push(data.description);
        paramIndex++;
      }

      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`);
        params.push(data.notes);
        paramIndex++;
      }

      // If items are being updated, delete old items and recalculate totals
      if (data.items) {
        await query('DELETE FROM expense_items WHERE expense_id = $1', [expenseId]);

        let subtotal = 0;
        let taxAmount = 0;
        let total = 0;

        // Create new items
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemSubtotal = item.quantity * item.unitPrice;
          const itemTaxAmount = itemSubtotal * ((item.taxRate || 19) / 100);
          const itemTotal = itemSubtotal + itemTaxAmount;

          subtotal += itemSubtotal;
          taxAmount += itemTaxAmount;
          total += itemTotal;

          await query(
            `INSERT INTO expense_items (
              expense_id, position, description, quantity, unit_price,
              tax_rate, account_id, cost_center_id,
              subtotal, tax_amount, total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              expenseId,
              i + 1,
              item.description,
              item.quantity,
              item.unitPrice,
              item.taxRate || 19,
              item.accountId || null,
              item.costCenterId || null,
              itemSubtotal,
              itemTaxAmount,
              itemTotal,
            ]
          );
        }

        updates.push(`subtotal = $${paramIndex}`);
        params.push(subtotal);
        paramIndex++;

        updates.push(`tax_amount = $${paramIndex}`);
        params.push(taxAmount);
        paramIndex++;

        updates.push(`total = $${paramIndex}`);
        params.push(total);
        paramIndex++;
      }

      if (updates.length > 0) {
        params.push(expenseId, userId);
        await query(
          `UPDATE expenses
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
          params
        );
      }

      await query('COMMIT');

      return await this.getExpenseById(userId, expenseId);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async updateExpenseStatus(
    userId: string,
    expenseId: string,
    status: 'submitted' | 'approved' | 'paid' | 'rejected' | 'cancelled'
  ): Promise<Expense> {
    const expense = await this.getExpenseById(userId, expenseId);

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'rejected', 'cancelled'],
      approved: ['paid', 'cancelled'],
      paid: [],
      rejected: [],
      cancelled: [],
    };

    if (!validTransitions[expense.status].includes(status)) {
      throw new AppError(`Cannot transition from ${expense.status} to ${status}`, 400);
    }

    const updates: string[] = [`status = $1`];
    const params: unknown[] = [status];
    let paramIndex = 2;

    // Set paid_date when status changes to paid
    if (status === 'paid') {
      updates.push(`paid_date = CURRENT_DATE`);
    }

    // Handle accounting integration when approving
    let journalEntryId: string | null = null;
    
    if (status === 'approved' && !expense.journalEntryId) {
      // 1. Get necessary accounts
      // Liability Account (Verbindlichkeiten aus LuL - 1600)
      const liabilityAccount = await ledgerService.getAccountByNumber(userId, '1600');
      if (!liabilityAccount) {
        throw new AppError('Standard Liability Account (1600) not found. Please seed accounts.', 400);
      }

      // Input Tax Account (Vorsteuer 19% - 1576) - simplified, assuming 19% for now or logic based on rate
      // Ideally we should look this up based on the tax rate of items
      const taxAccount19 = await ledgerService.getAccountByNumber(userId, '1576');
      const taxAccount7 = await ledgerService.getAccountByNumber(userId, '1571');

      // 2. Build Journal Entry Lines
      const lines: any[] = [];
      let totalTax19 = 0;
      let totalTax7 = 0;

      // Expense Lines (Debit)
      for (const item of expense.items || []) {
        if (!item.accountId) {
           // Try to find default account from category if not on item
           if (expense.categoryId) {
             const categoryResult = await query(
               'SELECT default_account_id FROM expense_categories WHERE id = $1', 
               [expense.categoryId]
             );
             if (categoryResult.rows.length > 0 && categoryResult.rows[0].default_account_id) {
               item.accountId = categoryResult.rows[0].default_account_id;
             }
           }
        }

        if (!item.accountId) {
          throw new AppError(`Expense item "${item.description}" has no account assigned.`, 400);
        }

        lines.push({
          accountId: item.accountId,
          debitAmount: item.subtotal, // Net amount
          creditAmount: 0,
          description: item.description,
          costCenterId: item.costCenterId || expense.costCenterId,
          taxCode: item.taxRate.toString(),
          taxAmount: item.taxAmount,
        });

        if (item.taxRate === 19) totalTax19 += item.taxAmount;
        else if (item.taxRate === 7) totalTax7 += item.taxAmount;
      }

      // Tax Lines (Debit)
      if (totalTax19 > 0) {
        if (!taxAccount19) throw new AppError('Tax Account (1576) not found.', 400);
        lines.push({
          accountId: taxAccount19.id,
          debitAmount: totalTax19,
          creditAmount: 0,
          description: 'Vorsteuer 19%',
        });
      }
      
      if (totalTax7 > 0) {
        if (!taxAccount7) throw new AppError('Tax Account (1571) not found.', 400);
        lines.push({
          accountId: taxAccount7.id,
          debitAmount: totalTax7,
          creditAmount: 0,
          description: 'Vorsteuer 7%',
        });
      }

      // Liability Line (Credit)
      lines.push({
        accountId: liabilityAccount.id,
        debitAmount: 0,
        creditAmount: expense.total, // Gross amount
        description: `Eingangsrechnung ${expense.vendorInvoiceNumber || ''} - ${expense.vendor?.companyName || ''}`,
      });

      // 3. Create Journal Entry
      const journalEntryData: CreateJournalEntryData = {
        entryDate: new Date().toISOString(), // Booking date = Approval date? Or Expense date? Usually Invoice Date (expenseDate)
        postingDate: new Date().toISOString(),
        entryType: 'expense',
        description: `Eingangsrechnung: ${expense.vendor?.companyName || 'Unbekannt'}`,
        notes: `Generiert aus Ausgabe ${expense.expenseNumber}`,
        lines: lines,
      };
      
      // Override entry date with expense date if possible, but posting date is now
      journalEntryData.entryDate = expense.expenseDate.toISOString();

      const journalEntry = await ledgerService.createJournalEntry(userId, journalEntryData);
      
      // 4. Post it
      await ledgerService.postJournalEntry(userId, journalEntry.id);
      
      journalEntryId = journalEntry.id;
      
      updates.push(`journal_entry_id = $${paramIndex}`);
      params.push(journalEntryId);
      paramIndex++;
    }

    params.push(expenseId, userId);

    await query(
      `UPDATE expenses
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      params
    );

    return await this.getExpenseById(userId, expenseId);
  }

  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const expense = await this.getExpenseById(userId, expenseId);

    if (expense.status !== 'draft') {
      throw new AppError('Only draft expenses can be deleted', 400);
    }

    await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [expenseId, userId]);
  }

  private async getNextExpenseNumber(userId: string): Promise<string> {
    const settingsResult = await query(
      'SELECT next_expense_number FROM accounting_settings WHERE user_id = $1',
      [userId]
    );

    if (settingsResult.rows.length === 0) {
      // Create settings if not exists
      await query(
        'INSERT INTO accounting_settings (user_id) VALUES ($1)',
        [userId]
      );
      return 'EXP-00001';
    }

    const nextNumber = settingsResult.rows[0].next_expense_number;
    return `EXP-${String(nextNumber).padStart(5, '0')}`;
  }

  async uploadReceipt(userId: string, expenseId: string, file: Express.Multer.File): Promise<Expense> {
    const expense = await this.getExpenseById(userId, expenseId);
    
    // Ensure uploads/receipts directory exists
    const fs = await import('fs');
    const path = await import('path');
    const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const filename = `${expenseId}_${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, filename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Update database
    const relativePath = `/uploads/receipts/${filename}`;
    
    const result = await query(
      `UPDATE expenses
       SET receipt_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [relativePath, expenseId, userId]
    );

    return this.mapExpense(result.rows[0]);
  }

  // ============================================
  // CATEGORY AND COST CENTER METHODS
  // ============================================

  async getCategories(userId: string): Promise<ExpenseCategory[]> {
    const result = await query(
      'SELECT * FROM expense_categories WHERE user_id = $1 AND is_active = true ORDER BY name',
      [userId]
    );

    return result.rows.map(this.mapExpenseCategory);
  }

  async createCategory(userId: string, name: string, description?: string, defaultAccountId?: string): Promise<ExpenseCategory> {
    const result = await query(
      `INSERT INTO expense_categories (user_id, name, description, default_account_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, description || null, defaultAccountId || null]
    );

    return this.mapExpenseCategory(result.rows[0]);
  }

  async getCostCenters(userId: string): Promise<CostCenter[]> {
    const result = await query(
      'SELECT * FROM cost_centers WHERE user_id = $1 AND is_active = true ORDER BY code',
      [userId]
    );

    return result.rows.map(this.mapCostCenter);
  }

  async createCostCenter(userId: string, code: string, name: string, description?: string): Promise<CostCenter> {
    const result = await query(
      `INSERT INTO cost_centers (user_id, code, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, code, name, description || null]
    );

    return this.mapCostCenter(result.rows[0]);
  }

  // ============================================
  // MAPPING METHODS
  // ============================================

  private mapVendor(row: any): Vendor {
    return {
      id: row.id,
      userId: row.user_id,
      vendorNumber: row.vendor_number,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      street: row.street,
      houseNumber: row.house_number,
      postalCode: row.postal_code,
      city: row.city,
      country: row.country,
      vatId: row.vat_id,
      taxNumber: row.tax_number,
      iban: row.iban,
      bic: row.bic,
      paymentTerms: row.payment_terms,
      defaultPaymentMethod: row.default_payment_method,
      isActive: row.is_active,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapExpense(row: any): Expense {
    return {
      id: row.id,
      userId: row.user_id,
      vendorId: row.vendor_id,
      expenseNumber: row.expense_number,
      vendorInvoiceNumber: row.vendor_invoice_number,
      status: row.status,
      expenseDate: new Date(row.expense_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      paidDate: row.paid_date ? new Date(row.paid_date) : undefined,
      categoryId: row.category_id,
      costCenterId: row.cost_center_id,
      description: row.description,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.tax_amount),
      total: parseFloat(row.total),
      currency: row.currency,
      paymentMethod: row.payment_method,
      receiptUrl: row.receipt_url,
      notes: row.notes,
      journalEntryId: row.journal_entry_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      vendor: row.vendor_name ? { companyName: row.vendor_name } as any : undefined,
    };
  }

  private mapExpenseItem(row: any): ExpenseItem {
    return {
      id: row.id,
      expenseId: row.expense_id,
      position: row.position,
      description: row.description,
      quantity: parseFloat(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      taxRate: parseFloat(row.tax_rate),
      accountId: row.account_id,
      costCenterId: row.cost_center_id,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.tax_amount),
      total: parseFloat(row.total),
      createdAt: new Date(row.created_at),
    };
  }

  private mapExpenseCategory(row: any): ExpenseCategory {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      defaultAccountId: row.default_account_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapCostCenter(row: any): CostCenter {
    return {
      id: row.id,
      userId: row.user_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new ExpenseService();
