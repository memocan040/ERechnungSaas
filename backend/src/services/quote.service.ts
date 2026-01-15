import { query } from '../config/database';
import { Quote, QuoteItem, CreateQuoteData, UpdateQuoteData, QuoteStats } from '../types';
import { AppError } from '../middleware/errorHandler';
import { invoiceService } from './invoice.service';

interface QuoteFilters {
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class QuoteService {
  async findAll(userId: string, filters: QuoteFilters = {}): Promise<{ quotes: Quote[]; total: number }> {
    const {
      search = '',
      status,
      customerId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;
    const params: unknown[] = [userId];
    let whereClause = 'WHERE q.user_id = $1';
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (q.quote_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND q.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (customerId) {
      whereClause += ` AND q.customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND q.issue_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND q.issue_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const allowedSortColumns = ['quote_number', 'issue_date', 'valid_until', 'total', 'status', 'created_at'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? `q.${sortBy}` : 'q.created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get quotes with customer info
    const quotesResult = await query(
      `SELECT q.*, c.company_name as customer_name, c.email as customer_email
       FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      quotes: quotesResult.rows.map(this.mapToQuote),
      total,
    };
  }

  async findById(userId: string, quoteId: string): Promise<Quote> {
    // Get quote with full customer data
    const quoteResult = await query(
      `SELECT q.*,
        c.company_name, c.contact_name, c.email AS customer_email, c.phone AS customer_phone,
        c.street AS customer_street, c.house_number AS customer_house_number,
        c.postal_code AS customer_postal_code, c.city AS customer_city,
        c.country AS customer_country, c.vat_id AS customer_vat_id,
        c.customer_number
       FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1 AND q.user_id = $2`,
      [quoteId, userId]
    );

    if (quoteResult.rows.length === 0) {
      throw new AppError('Quote not found', 404);
    }

    // Get quote items
    const itemsResult = await query(
      'SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY position',
      [quoteId]
    );

    // Get company data for the quote
    const companyResult = await query(
      `SELECT * FROM companies WHERE user_id = $1`,
      [userId]
    );

    const row = quoteResult.rows[0];
    const quote = this.mapToQuote(row);
    quote.items = itemsResult.rows.map(this.mapToQuoteItem);

    // Add complete customer data
    if (row.company_name) {
      quote.customer = {
        id: row.customer_id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.customer_email,
        phone: row.customer_phone,
        street: row.customer_street,
        houseNumber: row.customer_house_number,
        postalCode: row.customer_postal_code,
        city: row.customer_city,
        country: row.customer_country,
        vatId: row.customer_vat_id,
        customerNumber: row.customer_number,
      } as any;
    }

    // Add company data
    if (companyResult.rows.length > 0) {
      const companyRow = companyResult.rows[0];
      quote.company = {
        id: companyRow.id,
        name: companyRow.name,
        legalName: companyRow.legal_name,
        street: companyRow.street,
        houseNumber: companyRow.house_number,
        postalCode: companyRow.postal_code,
        city: companyRow.city,
        country: companyRow.country,
        vatId: companyRow.vat_id,
        taxNumber: companyRow.tax_number,
        tradeRegister: companyRow.trade_register,
        court: companyRow.court,
        managingDirector: companyRow.managing_director,
        phone: companyRow.phone,
        email: companyRow.email,
        website: companyRow.website,
        bankName: companyRow.bank_name,
        iban: companyRow.iban,
        bic: companyRow.bic,
        logoUrl: companyRow.logo_url,
      } as any;
    }

    return quote;
  }

  async create(userId: string, data: CreateQuoteData): Promise<Quote> {
    // Get next quote number
    const settingsResult = await query(
      'SELECT quote_prefix, next_quote_number FROM user_settings WHERE user_id = $1',
      [userId]
    );

    const settings = settingsResult.rows[0] || { quote_prefix: 'AN-', next_quote_number: 1 };
    const quoteNumber = `${settings.quote_prefix}${String(settings.next_quote_number).padStart(5, '0')}`;

    // Calculate totals
    const items = data.items.map((item, index) => {
      const taxRate = item.taxRate ?? 19;
      const subtotal = item.quantity * item.unitPrice;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      return {
        ...item,
        position: index + 1,
        unit: item.unit || 'Stück',
        taxRate,
        subtotal,
        taxAmount,
        total,
      };
    });

    const quoteSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const quoteTaxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const quoteTotal = items.reduce((sum, item) => sum + item.total, 0);

    // Create quote
    const quoteResult = await query(
      `INSERT INTO quotes (
        user_id, customer_id, quote_number, issue_date, valid_until,
        subtotal, tax_amount, total, notes, terms_conditions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        data.customerId,
        quoteNumber,
        data.issueDate,
        data.validUntil,
        quoteSubtotal,
        quoteTaxAmount,
        quoteTotal,
        data.notes || null,
        data.termsConditions || null,
      ]
    );

    const quote = quoteResult.rows[0];

    // Create quote items
    for (const item of items) {
      await query(
        `INSERT INTO quote_items (
          quote_id, position, description, quantity, unit,
          unit_price, tax_rate, subtotal, tax_amount, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          quote.id,
          item.position,
          item.description,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.taxRate,
          item.subtotal,
          item.taxAmount,
          item.total,
        ]
      );
    }

    // Update next quote number
    await query(
      'UPDATE user_settings SET next_quote_number = next_quote_number + 1 WHERE user_id = $1',
      [userId]
    );

    return this.findById(userId, quote.id);
  }

  async update(userId: string, quoteId: string, data: UpdateQuoteData): Promise<Quote> {
    const existingQuote = await this.findById(userId, quoteId);

    if (existingQuote.status !== 'draft') {
      throw new AppError('Can only edit draft quotes', 400);
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields = ['customerId', 'issueDate', 'validUntil', 'notes', 'termsConditions'];
    const fieldMapping: Record<string, string> = {
      customerId: 'customer_id',
      issueDate: 'issue_date',
      validUntil: 'valid_until',
      termsConditions: 'terms_conditions',
    };

    for (const field of updateableFields) {
      if (data[field as keyof UpdateQuoteData] !== undefined) {
        const dbField = fieldMapping[field] || field;
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(data[field as keyof UpdateQuoteData]);
        paramIndex++;
      }
    }

    // Update items if provided
    if (data.items && data.items.length > 0) {
      // Delete existing items
      await query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);

      // Recalculate totals
      const items = data.items.map((item, index) => {
        const taxRate = item.taxRate ?? 19;
        const subtotal = item.quantity * item.unitPrice;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        return {
          ...item,
          position: index + 1,
          unit: item.unit || 'Stück',
          taxRate,
          subtotal,
          taxAmount,
          total,
        };
      });

      const quoteSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const quoteTaxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
      const quoteTotal = items.reduce((sum, item) => sum + item.total, 0);

      fields.push(`subtotal = $${paramIndex}`);
      values.push(quoteSubtotal);
      paramIndex++;

      fields.push(`tax_amount = $${paramIndex}`);
      values.push(quoteTaxAmount);
      paramIndex++;

      fields.push(`total = $${paramIndex}`);
      values.push(quoteTotal);
      paramIndex++;

      // Insert new items
      for (const item of items) {
        await query(
          `INSERT INTO quote_items (
            quote_id, position, description, quantity, unit,
            unit_price, tax_rate, subtotal, tax_amount, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            quoteId,
            item.position,
            item.description,
            item.quantity,
            item.unit,
            item.unitPrice,
            item.taxRate,
            item.subtotal,
            item.taxAmount,
            item.total,
          ]
        );
      }
    }

    if (fields.length > 0) {
      values.push(quoteId, userId);
      await query(
        `UPDATE quotes SET ${fields.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values
      );
    }

    return this.findById(userId, quoteId);
  }

  async updateStatus(userId: string, quoteId: string, status: Quote['status']): Promise<Quote> {
    const quote = await this.findById(userId, quoteId);

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['sent'],
      sent: ['accepted', 'rejected', 'expired'],
      accepted: ['converted'],
      rejected: [],
      expired: [],
      converted: [],
    };

    if (!validTransitions[quote.status]?.includes(status)) {
      throw new AppError(`Cannot change status from '${quote.status}' to '${status}'`, 400);
    }

    await query(
      'UPDATE quotes SET status = $1 WHERE id = $2 AND user_id = $3',
      [status, quoteId, userId]
    );

    return this.findById(userId, quoteId);
  }

  async delete(userId: string, quoteId: string): Promise<void> {
    const quote = await this.findById(userId, quoteId);

    if (quote.status !== 'draft') {
      throw new AppError('Can only delete draft quotes', 400);
    }

    await query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);
    const result = await query(
      'DELETE FROM quotes WHERE id = $1 AND user_id = $2 RETURNING id',
      [quoteId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Quote not found', 404);
    }
  }

  async convertToInvoice(userId: string, quoteId: string): Promise<{ quote: Quote; invoiceId: string }> {
    const quote = await this.findById(userId, quoteId);

    if (quote.status !== 'accepted') {
      throw new AppError('Only accepted quotes can be converted to invoices', 400);
    }

    if (quote.convertedInvoiceId) {
      throw new AppError('This quote has already been converted to an invoice', 400);
    }

    // Get user settings for payment days
    const settingsResult = await query(
      'SELECT default_payment_days FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const settings = settingsResult.rows[0] || { default_payment_days: 14 };

    // Calculate due date
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + settings.default_payment_days);

    // Create invoice from quote data
    const invoice = await invoiceService.create(userId, {
      customerId: quote.customerId,
      issueDate: issueDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      notes: quote.notes,
      paymentTerms: undefined,
      items: (quote.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      })),
    });

    // Update quote status to converted
    await query(
      `UPDATE quotes SET status = 'converted', converted_date = $1, converted_invoice_id = $2
       WHERE id = $3 AND user_id = $4`,
      [new Date().toISOString().split('T')[0], invoice.id, quoteId, userId]
    );

    return {
      quote: await this.findById(userId, quoteId),
      invoiceId: invoice.id,
    };
  }

  async getStats(userId: string): Promise<QuoteStats> {
    const result = await query(
      `SELECT
        COUNT(*) as total_quotes,
        COALESCE(SUM(CASE WHEN status IN ('sent') THEN total ELSE 0 END), 0) as pending_value,
        COALESCE(SUM(CASE WHEN status = 'accepted' THEN total ELSE 0 END), 0) as accepted_value,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_quotes,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_quotes,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_quotes,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_quotes,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_quotes,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_quotes
       FROM quotes
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    const totalSentOrDecided = parseInt(row.sent_quotes, 10) + parseInt(row.accepted_quotes, 10) +
                               parseInt(row.rejected_quotes, 10) + parseInt(row.expired_quotes, 10) +
                               parseInt(row.converted_quotes, 10);
    const acceptedOrConverted = parseInt(row.accepted_quotes, 10) + parseInt(row.converted_quotes, 10);
    const conversionRate = totalSentOrDecided > 0 ? (acceptedOrConverted / totalSentOrDecided) * 100 : 0;

    return {
      totalQuotes: parseInt(row.total_quotes, 10),
      pendingValue: parseFloat(row.pending_value),
      acceptedValue: parseFloat(row.accepted_value),
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      draftQuotes: parseInt(row.draft_quotes, 10),
      sentQuotes: parseInt(row.sent_quotes, 10),
      acceptedQuotes: parseInt(row.accepted_quotes, 10),
      rejectedQuotes: parseInt(row.rejected_quotes, 10),
      expiredQuotes: parseInt(row.expired_quotes, 10),
    };
  }

  async checkExpiredQuotes(userId: string): Promise<number> {
    const result = await query(
      `UPDATE quotes SET status = 'expired'
       WHERE user_id = $1 AND status = 'sent' AND valid_until < CURRENT_DATE
       RETURNING id`,
      [userId]
    );
    return result.rows.length;
  }

  private mapToQuote(row: Record<string, unknown>): Quote {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      customerId: row.customer_id as string,
      quoteNumber: row.quote_number as string,
      status: row.status as Quote['status'],
      issueDate: row.issue_date as Date,
      validUntil: row.valid_until as Date,
      convertedDate: row.converted_date as Date | undefined,
      convertedInvoiceId: row.converted_invoice_id as string | undefined,
      subtotal: parseFloat(row.subtotal as string),
      taxAmount: parseFloat(row.tax_amount as string),
      total: parseFloat(row.total as string),
      currency: row.currency as string,
      notes: row.notes as string | undefined,
      termsConditions: row.terms_conditions as string | undefined,
      pdfUrl: row.pdf_url as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      customer: row.customer_name ? {
        companyName: row.customer_name as string,
        email: row.customer_email as string,
      } as any : undefined,
    };
  }

  private mapToQuoteItem(row: Record<string, unknown>): QuoteItem {
    return {
      id: row.id as string,
      quoteId: row.quote_id as string,
      position: row.position as number,
      description: row.description as string,
      quantity: parseFloat(row.quantity as string),
      unit: row.unit as string,
      unitPrice: parseFloat(row.unit_price as string),
      taxRate: parseFloat(row.tax_rate as string),
      subtotal: parseFloat(row.subtotal as string),
      taxAmount: parseFloat(row.tax_amount as string),
      total: parseFloat(row.total as string),
    };
  }
}

export const quoteService = new QuoteService();
