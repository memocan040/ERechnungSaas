import { query } from '../config/database';
import { Customer } from '../types';
import { AppError } from '../middleware/errorHandler';

interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CustomerService {
  async findAll(userId: string, filters: CustomerFilters = {}): Promise<{ customers: Customer[]; total: number }> {
    const {
      search = '',
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;
    const params: (string | boolean | number)[] = [userId];
    let whereClause = 'WHERE user_id = $1';
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (company_name ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortColumns = ['company_name', 'contact_name', 'email', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM customers ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get customers
    const customersResult = await query(
      `SELECT * FROM customers ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      customers: customersResult.rows.map(this.mapToCustomer),
      total,
    };
  }

  async findById(userId: string, customerId: string): Promise<Customer> {
    const result = await query(
      'SELECT * FROM customers WHERE id = $1 AND user_id = $2',
      [customerId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    return this.mapToCustomer(result.rows[0]);
  }

  async create(userId: string, data: Partial<Customer>): Promise<Customer> {
    const result = await query(
      `INSERT INTO customers (
        user_id, company_name, contact_name, email, phone,
        street, house_number, postal_code, city, country,
        vat_id, customer_number, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        userId,
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
        data.customerNumber || null,
        data.notes || null,
      ]
    );

    return this.mapToCustomer(result.rows[0]);
  }

  async update(userId: string, customerId: string, data: Partial<Customer>): Promise<Customer> {
    // Verify customer belongs to user
    await this.findById(userId, customerId);

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'companyName', 'contactName', 'email', 'phone', 'street',
      'houseNumber', 'postalCode', 'city', 'country', 'vatId',
      'customerNumber', 'notes', 'isActive'
    ];

    const fieldMapping: Record<string, string> = {
      companyName: 'company_name',
      contactName: 'contact_name',
      houseNumber: 'house_number',
      postalCode: 'postal_code',
      vatId: 'vat_id',
      customerNumber: 'customer_number',
      isActive: 'is_active',
    };

    for (const field of updateableFields) {
      if (data[field as keyof Customer] !== undefined) {
        const dbField = fieldMapping[field] || field;
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(data[field as keyof Customer]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(userId, customerId);
    }

    values.push(customerId, userId);
    const result = await query(
      `UPDATE customers SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return this.mapToCustomer(result.rows[0]);
  }

  async delete(userId: string, customerId: string): Promise<void> {
    // Check if customer has invoices
    const invoiceCheck = await query(
      'SELECT COUNT(*) FROM invoices WHERE customer_id = $1',
      [customerId]
    );

    if (parseInt(invoiceCheck.rows[0].count, 10) > 0) {
      throw new AppError('Cannot delete customer with existing invoices', 400);
    }

    const result = await query(
      'DELETE FROM customers WHERE id = $1 AND user_id = $2 RETURNING id',
      [customerId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }
  }

  async getStats(userId: string, customerId: string): Promise<{
    totalInvoices: number;
    totalRevenue: number;
    outstandingAmount: number;
  }> {
    const result = await query(
      `SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0) as outstanding_amount
       FROM invoices
       WHERE customer_id = $1 AND user_id = $2`,
      [customerId, userId]
    );

    return {
      totalInvoices: parseInt(result.rows[0].total_invoices, 10),
      totalRevenue: parseFloat(result.rows[0].total_revenue),
      outstandingAmount: parseFloat(result.rows[0].outstanding_amount),
    };
  }

  /**
   * Find customer by VAT ID or company name + postal code (for XML import matching)
   */
  async findByVatIdOrName(
    userId: string,
    vatId?: string,
    companyName?: string,
    postalCode?: string
  ): Promise<Customer | null> {
    // Try to match by VAT ID first (most reliable)
    if (vatId) {
      const result = await query(
        'SELECT * FROM customers WHERE user_id = $1 AND vat_id = $2 LIMIT 1',
        [userId, vatId]
      );
      if (result.rows.length > 0) {
        return this.mapToCustomer(result.rows[0]);
      }
    }

    // Try to match by company name + postal code
    if (companyName && postalCode) {
      const result = await query(
        'SELECT * FROM customers WHERE user_id = $1 AND company_name = $2 AND postal_code = $3 LIMIT 1',
        [userId, companyName, postalCode]
      );
      if (result.rows.length > 0) {
        return this.mapToCustomer(result.rows[0]);
      }
    }

    return null;
  }

  /**
   * Create customer from XML import data
   */
  async createFromImport(userId: string, data: Partial<Customer>): Promise<Customer> {
    return this.create(userId, data);
  }

  private mapToCustomer(row: Record<string, unknown>): Customer {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      companyName: row.company_name as string,
      contactName: row.contact_name as string | undefined,
      email: row.email as string | undefined,
      phone: row.phone as string | undefined,
      street: row.street as string | undefined,
      houseNumber: row.house_number as string | undefined,
      postalCode: row.postal_code as string | undefined,
      city: row.city as string | undefined,
      country: row.country as string,
      vatId: row.vat_id as string | undefined,
      customerNumber: row.customer_number as string | undefined,
      notes: row.notes as string | undefined,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export const customerService = new CustomerService();
