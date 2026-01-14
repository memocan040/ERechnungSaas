import { query } from '../config/database';
import { Invoice, InvoiceItem } from '../types';
import { AppError } from '../middleware/errorHandler';
import { zugferdService } from './zugferd.service';

interface InvoiceFilters {
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

interface CreateInvoiceData {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  paymentTerms?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export class InvoiceService {
  async findAll(userId: string, filters: InvoiceFilters = {}): Promise<{ invoices: Invoice[]; total: number }> {
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
    let whereClause = 'WHERE i.user_id = $1';
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (i.invoice_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (customerId) {
      whereClause += ` AND i.customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND i.issue_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND i.issue_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const allowedSortColumns = ['invoice_number', 'issue_date', 'due_date', 'total', 'status', 'created_at'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? `i.${sortBy}` : 'i.created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get invoices with customer info
    const invoicesResult = await query(
      `SELECT i.*, c.company_name as customer_name, c.email as customer_email
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      invoices: invoicesResult.rows.map(this.mapToInvoice),
      total,
    };
  }

  async findById(userId: string, invoiceId: string): Promise<Invoice> {
    // Get invoice with full customer data
    const invoiceResult = await query(
      `SELECT i.*, 
        c.company_name, c.contact_name, c.email AS customer_email, c.phone AS customer_phone,
        c.street AS customer_street, c.house_number AS customer_house_number,
        c.postal_code AS customer_postal_code, c.city AS customer_city, 
        c.country AS customer_country, c.vat_id AS customer_vat_id,
        c.customer_number
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.id = $1 AND i.user_id = $2`,
      [invoiceId, userId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new AppError('Invoice not found', 404);
    }

    // Get invoice items
    const itemsResult = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY position',
      [invoiceId]
    );

    // Get company data for the invoice
    const companyResult = await query(
      `SELECT * FROM companies WHERE user_id = $1`,
      [userId]
    );

    const row = invoiceResult.rows[0];
    const invoice = this.mapToInvoice(row);
    invoice.items = itemsResult.rows.map(this.mapToInvoiceItem);

    // Add complete customer data
    if (row.company_name) {
      invoice.customer = {
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
      invoice.company = {
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

    return invoice;
  }

  async create(userId: string, data: CreateInvoiceData): Promise<Invoice> {
    // Get next invoice number
    const settingsResult = await query(
      'SELECT invoice_prefix, next_invoice_number FROM user_settings WHERE user_id = $1',
      [userId]
    );

    const settings = settingsResult.rows[0] || { invoice_prefix: 'RE-', next_invoice_number: 1 };
    const invoiceNumber = `${settings.invoice_prefix}${String(settings.next_invoice_number).padStart(5, '0')}`;

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

    const invoiceSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const invoiceTaxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const invoiceTotal = items.reduce((sum, item) => sum + item.total, 0);

    // Create invoice
    const invoiceResult = await query(
      `INSERT INTO invoices (
        user_id, customer_id, invoice_number, issue_date, due_date,
        subtotal, tax_amount, total, notes, payment_terms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        data.customerId,
        invoiceNumber,
        data.issueDate,
        data.dueDate,
        invoiceSubtotal,
        invoiceTaxAmount,
        invoiceTotal,
        data.notes || null,
        data.paymentTerms || null,
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Create invoice items
    for (const item of items) {
      await query(
        `INSERT INTO invoice_items (
          invoice_id, position, description, quantity, unit,
          unit_price, tax_rate, subtotal, tax_amount, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          invoice.id,
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

    // Update next invoice number
    await query(
      'UPDATE user_settings SET next_invoice_number = next_invoice_number + 1 WHERE user_id = $1',
      [userId]
    );

    // Get the complete invoice with all data
    const completeInvoice = await this.findById(userId, invoice.id);

    // Generate and store XML
    try {
      const xmlData = await zugferdService.generateXml(userId, completeInvoice);
      await query(
        'UPDATE invoices SET xml_data = $1 WHERE id = $2',
        [xmlData, invoice.id]
      );
    } catch (error) {
      console.error('Failed to generate XML for invoice:', error);
      // Don't fail invoice creation if XML generation fails
    }

    return this.findById(userId, invoice.id);
  }

  async update(userId: string, invoiceId: string, data: Partial<Invoice & { items?: CreateInvoiceData['items'] }>): Promise<Invoice> {
    const existingInvoice = await this.findById(userId, invoiceId);

    if (existingInvoice.status !== 'draft') {
      throw new AppError('Can only edit draft invoices', 400);
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields = ['customerId', 'issueDate', 'dueDate', 'notes', 'paymentTerms', 'status'];
    const fieldMapping: Record<string, string> = {
      customerId: 'customer_id',
      issueDate: 'issue_date',
      dueDate: 'due_date',
      paymentTerms: 'payment_terms',
    };

    for (const field of updateableFields) {
      if (data[field as keyof typeof data] !== undefined) {
        const dbField = fieldMapping[field] || field;
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(data[field as keyof typeof data]);
        paramIndex++;
      }
    }

    // Update items if provided
    if (data.items && data.items.length > 0) {
      // Delete existing items
      await query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

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

      const invoiceSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const invoiceTaxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
      const invoiceTotal = items.reduce((sum, item) => sum + item.total, 0);

      fields.push(`subtotal = $${paramIndex}`);
      values.push(invoiceSubtotal);
      paramIndex++;

      fields.push(`tax_amount = $${paramIndex}`);
      values.push(invoiceTaxAmount);
      paramIndex++;

      fields.push(`total = $${paramIndex}`);
      values.push(invoiceTotal);
      paramIndex++;

      // Insert new items
      for (const item of items) {
        await query(
          `INSERT INTO invoice_items (
            invoice_id, position, description, quantity, unit,
            unit_price, tax_rate, subtotal, tax_amount, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            invoiceId,
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
      values.push(invoiceId, userId);
      await query(
        `UPDATE invoices SET ${fields.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values
      );
    }

    // Get the updated invoice
    const updatedInvoice = await this.findById(userId, invoiceId);

    // Regenerate XML with updated data
    try {
      const xmlData = await zugferdService.generateXml(userId, updatedInvoice);
      await query(
        'UPDATE invoices SET xml_data = $1 WHERE id = $2',
        [xmlData, invoiceId]
      );
    } catch (error) {
      console.error('Failed to regenerate XML for invoice:', error);
    }

    return this.findById(userId, invoiceId);
  }

  async updateStatus(userId: string, invoiceId: string, status: Invoice['status']): Promise<Invoice> {
    const invoice = await this.findById(userId, invoiceId);

    const updates: string[] = ['status = $1'];
    const values: unknown[] = [status];
    let paramIndex = 2;

    if (status === 'paid' && !invoice.paidDate) {
      updates.push(`paid_date = $${paramIndex}`);
      values.push(new Date().toISOString().split('T')[0]);
      paramIndex++;
    }

    values.push(invoiceId, userId);
    await query(
      `UPDATE invoices SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      values
    );

    return this.findById(userId, invoiceId);
  }

  async delete(userId: string, invoiceId: string): Promise<void> {
    const invoice = await this.findById(userId, invoiceId);

    if (invoice.status !== 'draft') {
      throw new AppError('Can only delete draft invoices', 400);
    }

    await query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
    const result = await query(
      'DELETE FROM invoices WHERE id = $1 AND user_id = $2 RETURNING id',
      [invoiceId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invoice not found', 404);
    }
  }

  async getStats(userId: string): Promise<{
    totalRevenue: number;
    outstandingAmount: number;
    overdueAmount: number;
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
  }> {
    const result = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0) as outstanding_amount,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) as overdue_amount,
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status IN ('sent', 'overdue') THEN 1 END) as pending_invoices
       FROM invoices
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    return {
      totalRevenue: parseFloat(row.total_revenue),
      outstandingAmount: parseFloat(row.outstanding_amount),
      overdueAmount: parseFloat(row.overdue_amount),
      totalInvoices: parseInt(row.total_invoices, 10),
      paidInvoices: parseInt(row.paid_invoices, 10),
      pendingInvoices: parseInt(row.pending_invoices, 10),
    };
  }

  private mapToInvoice(row: Record<string, unknown>): Invoice {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      customerId: row.customer_id as string,
      invoiceNumber: row.invoice_number as string,
      status: row.status as Invoice['status'],
      issueDate: row.issue_date as Date,
      dueDate: row.due_date as Date,
      paidDate: row.paid_date as Date | undefined,
      subtotal: parseFloat(row.subtotal as string),
      taxAmount: parseFloat(row.tax_amount as string),
      total: parseFloat(row.total as string),
      currency: row.currency as string,
      notes: row.notes as string | undefined,
      paymentTerms: row.payment_terms as string | undefined,
      pdfUrl: row.pdf_url as string | undefined,
      xmlData: row.xml_data as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      customer: row.customer_name ? {
        companyName: row.customer_name as string,
        email: row.customer_email as string,
      } as any : undefined,
    };
  }

  private mapToInvoiceItem(row: Record<string, unknown>): InvoiceItem {
    return {
      id: row.id as string,
      invoiceId: row.invoice_id as string,
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

export const invoiceService = new InvoiceService();
