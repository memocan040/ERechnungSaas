import { query } from '../config/database';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface RevenueByMonth {
  month: string;
  revenue: number;
  invoiceCount: number;
}

interface CustomerRevenue {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  invoiceCount: number;
  avgInvoiceValue: number;
}

interface TaxSummary {
  taxRate: number;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
}

interface InvoiceStatusSummary {
  status: string;
  count: number;
  totalAmount: number;
}

export class ReportService {
  async getRevenueByMonth(userId: string, dateRange?: DateRange): Promise<RevenueByMonth[]> {
    let whereClause = "WHERE user_id = $1 AND status = 'paid'";
    const params: unknown[] = [userId];

    if (dateRange?.startDate) {
      whereClause += ` AND paid_date >= $${params.length + 1}`;
      params.push(dateRange.startDate);
    }

    if (dateRange?.endDate) {
      whereClause += ` AND paid_date <= $${params.length + 1}`;
      params.push(dateRange.endDate);
    }

    const result = await query(
      `SELECT
        TO_CHAR(paid_date, 'YYYY-MM') as month,
        SUM(total) as revenue,
        COUNT(*) as invoice_count
       FROM invoices
       ${whereClause}
       GROUP BY TO_CHAR(paid_date, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    return result.rows.map((row) => ({
      month: row.month,
      revenue: parseFloat(row.revenue),
      invoiceCount: parseInt(row.invoice_count, 10),
    }));
  }

  async getRevenueByCustomer(userId: string, dateRange?: DateRange, limit = 10): Promise<CustomerRevenue[]> {
    let whereClause = "WHERE i.user_id = $1 AND i.status = 'paid'";
    const params: unknown[] = [userId];

    if (dateRange?.startDate) {
      whereClause += ` AND i.paid_date >= $${params.length + 1}`;
      params.push(dateRange.startDate);
    }

    if (dateRange?.endDate) {
      whereClause += ` AND i.paid_date <= $${params.length + 1}`;
      params.push(dateRange.endDate);
    }

    params.push(limit);

    const result = await query(
      `SELECT
        c.id as customer_id,
        c.company_name as customer_name,
        SUM(i.total) as total_revenue,
        COUNT(*) as invoice_count,
        AVG(i.total) as avg_invoice_value
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       ${whereClause}
       GROUP BY c.id, c.company_name
       ORDER BY total_revenue DESC
       LIMIT $${params.length}`,
      params
    );

    return result.rows.map((row) => ({
      customerId: row.customer_id,
      customerName: row.customer_name,
      totalRevenue: parseFloat(row.total_revenue),
      invoiceCount: parseInt(row.invoice_count, 10),
      avgInvoiceValue: parseFloat(row.avg_invoice_value),
    }));
  }

  async getTaxSummary(userId: string, dateRange?: DateRange): Promise<TaxSummary[]> {
    let whereClause = "WHERE i.user_id = $1 AND i.status IN ('sent', 'paid', 'overdue')";
    const params: unknown[] = [userId];

    if (dateRange?.startDate) {
      whereClause += ` AND i.issue_date >= $${params.length + 1}`;
      params.push(dateRange.startDate);
    }

    if (dateRange?.endDate) {
      whereClause += ` AND i.issue_date <= $${params.length + 1}`;
      params.push(dateRange.endDate);
    }

    const result = await query(
      `SELECT
        ii.tax_rate,
        SUM(ii.subtotal) as net_amount,
        SUM(ii.tax_amount) as tax_amount,
        SUM(ii.total) as gross_amount
       FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       ${whereClause}
       GROUP BY ii.tax_rate
       ORDER BY ii.tax_rate DESC`,
      params
    );

    return result.rows.map((row) => ({
      taxRate: parseFloat(row.tax_rate),
      netAmount: parseFloat(row.net_amount),
      taxAmount: parseFloat(row.tax_amount),
      grossAmount: parseFloat(row.gross_amount),
    }));
  }

  async getInvoiceStatusSummary(userId: string, dateRange?: DateRange): Promise<InvoiceStatusSummary[]> {
    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (dateRange?.startDate) {
      whereClause += ` AND issue_date >= $${params.length + 1}`;
      params.push(dateRange.startDate);
    }

    if (dateRange?.endDate) {
      whereClause += ` AND issue_date <= $${params.length + 1}`;
      params.push(dateRange.endDate);
    }

    const result = await query(
      `SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_amount
       FROM invoices
       ${whereClause}
       GROUP BY status
       ORDER BY count DESC`,
      params
    );

    return result.rows.map((row) => ({
      status: row.status,
      count: parseInt(row.count, 10),
      totalAmount: parseFloat(row.total_amount),
    }));
  }

  async getDashboardStats(userId: string): Promise<{
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueTrend: number;
    outstandingAmount: number;
    overdueAmount: number;
    totalInvoices: number;
    invoicesThisMonth: number;
  }> {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const result = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_date >= $2 THEN total ELSE 0 END), 0) as revenue_this_month,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_date >= $3 AND paid_date <= $4 THEN total ELSE 0 END), 0) as revenue_last_month,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0) as outstanding_amount,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) as overdue_amount,
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN issue_date >= $2 THEN 1 END) as invoices_this_month
       FROM invoices
       WHERE user_id = $1`,
      [userId, firstDayThisMonth, firstDayLastMonth, lastDayLastMonth]
    );

    const row = result.rows[0];
    const revenueThisMonth = parseFloat(row.revenue_this_month);
    const revenueLastMonth = parseFloat(row.revenue_last_month);
    const revenueTrend = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0;

    return {
      totalRevenue: parseFloat(row.total_revenue),
      revenueThisMonth,
      revenueLastMonth,
      revenueTrend,
      outstandingAmount: parseFloat(row.outstanding_amount),
      overdueAmount: parseFloat(row.overdue_amount),
      totalInvoices: parseInt(row.total_invoices, 10),
      invoicesThisMonth: parseInt(row.invoices_this_month, 10),
    };
  }

  async exportToCsv(data: Record<string, unknown>[], headers: string[]): Promise<string> {
    const headerRow = headers.join(',');
    const dataRows = data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );

    return [headerRow, ...dataRows].join('\n');
  }
}

export const reportService = new ReportService();
