import { query } from '../config/database';
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

    const expenses: Expense[] = [];
    for (const row of expensesResult.rows) {
      const expense = this.mapExpense(row);

      // Get items
      const itemsResult = await query(
        'SELECT * FROM expense_items WHERE expense_id = $1 ORDER BY position',
        [expense.id]
      );
      expense.items = itemsResult.rows.map(this.mapExpenseItem);

      expenses.push(expense);
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
