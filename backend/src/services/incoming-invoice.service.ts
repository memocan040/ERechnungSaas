import { query } from '../config/database';
import {
  IncomingInvoice,
  IncomingInvoiceItem,
  IncomingInvoiceStatus,
  CreateIncomingInvoiceData,
  UpdateIncomingInvoiceData,
  IncomingInvoiceFilters,
  IncomingInvoiceStats,
  OcrResult,
} from '../types';
import { AppError } from '../middleware/errorHandler';
import ocrService from './ocr.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(__dirname, '../../uploads/eingang');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class IncomingInvoiceService {
  // ============================================
  // QUERY METHODS
  // ============================================

  async findAll(
    userId: string,
    filters: IncomingInvoiceFilters = {}
  ): Promise<{ invoices: IncomingInvoice[]; total: number }> {
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
    let whereClause = 'WHERE ii.user_id = $1';
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (
        ii.invoice_number ILIKE $${paramIndex} OR
        ii.vendor_invoice_number ILIKE $${paramIndex} OR
        ii.vendor_name ILIKE $${paramIndex} OR
        ii.description ILIKE $${paramIndex} OR
        v.company_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND ii.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendorId) {
      whereClause += ` AND ii.vendor_id = $${paramIndex}`;
      params.push(vendorId);
      paramIndex++;
    }

    if (categoryId) {
      whereClause += ` AND ii.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND ii.invoice_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND ii.invoice_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM incoming_invoices ii
       LEFT JOIN vendors v ON ii.vendor_id = v.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get invoices
    params.push(limit, offset);
    const invoicesResult = await query(
      `SELECT ii.*,
              v.company_name as vendor_company_name,
              ec.name as category_name,
              cc.name as cost_center_name,
              cc.code as cost_center_code
       FROM incoming_invoices ii
       LEFT JOIN vendors v ON ii.vendor_id = v.id
       LEFT JOIN expense_categories ec ON ii.category_id = ec.id
       LEFT JOIN cost_centers cc ON ii.cost_center_id = cc.id
       ${whereClause}
       ORDER BY ii.received_date DESC, ii.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    const invoices: IncomingInvoice[] = [];
    for (const row of invoicesResult.rows) {
      const invoice = this.mapIncomingInvoice(row);
      invoices.push(invoice);
    }

    return { invoices, total };
  }

  async findById(userId: string, id: string): Promise<IncomingInvoice> {
    const result = await query(
      `SELECT ii.*,
              v.company_name as vendor_company_name,
              v.email as vendor_email,
              ec.name as category_name,
              cc.name as cost_center_name,
              cc.code as cost_center_code
       FROM incoming_invoices ii
       LEFT JOIN vendors v ON ii.vendor_id = v.id
       LEFT JOIN expense_categories ec ON ii.category_id = ec.id
       LEFT JOIN cost_centers cc ON ii.cost_center_id = cc.id
       WHERE ii.id = $1 AND ii.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Incoming invoice not found', 404);
    }

    const invoice = this.mapIncomingInvoice(result.rows[0]);

    // Get items
    const itemsResult = await query(
      `SELECT iii.*,
              coa.account_number, coa.account_name,
              cc.name as cost_center_name, cc.code as cost_center_code
       FROM incoming_invoice_items iii
       LEFT JOIN chart_of_accounts coa ON iii.account_id = coa.id
       LEFT JOIN cost_centers cc ON iii.cost_center_id = cc.id
       WHERE iii.incoming_invoice_id = $1
       ORDER BY iii.position`,
      [id]
    );

    invoice.items = itemsResult.rows.map(this.mapIncomingInvoiceItem);

    return invoice;
  }

  // ============================================
  // CREATE METHODS
  // ============================================

  async createFromUpload(
    userId: string,
    file: Express.Multer.File
  ): Promise<{ invoice: IncomingInvoice; ocrResult: OcrResult }> {
    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${Date.now()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Move file to permanent storage
    fs.writeFileSync(filePath, file.buffer);

    try {
      // Process with OCR
      const ocrResult = await ocrService.processFile(filePath, file.mimetype);

      // Get next invoice number
      const invoiceNumber = await this.getNextInvoiceNumber(userId);

      // Create invoice from OCR data
      const result = await query(
        `INSERT INTO incoming_invoices (
          user_id, invoice_number, vendor_invoice_number,
          invoice_date, due_date, received_date,
          vendor_name, vendor_address, vendor_vat_id, vendor_tax_number,
          vendor_iban, vendor_bic,
          subtotal, tax_amount, total, currency,
          payment_reference,
          file_path, file_type, original_filename,
          ocr_raw_text, ocr_confidence, ocr_processed_at,
          status
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP, 'draft')
        RETURNING *`,
        [
          userId,
          invoiceNumber,
          ocrResult.extractedData.invoiceNumber || null,
          ocrResult.extractedData.invoiceDate || null,
          ocrResult.extractedData.dueDate || null,
          ocrResult.extractedData.vendorName || null,
          ocrResult.extractedData.vendorAddress || null,
          ocrResult.extractedData.vendorVatId || null,
          ocrResult.extractedData.vendorTaxNumber || null,
          ocrResult.extractedData.vendorIban || null,
          ocrResult.extractedData.vendorBic || null,
          ocrResult.extractedData.subtotal || 0,
          ocrResult.extractedData.taxAmount || 0,
          ocrResult.extractedData.total || 0,
          ocrResult.extractedData.currency || 'EUR',
          ocrResult.extractedData.paymentReference || null,
          filePath,
          file.mimetype,
          file.originalname,
          ocrResult.rawText,
          ocrResult.confidence,
        ]
      );

      const invoice = await this.findById(userId, result.rows[0].id);

      return { invoice, ocrResult };
    } catch (error) {
      // Clean up file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  async create(userId: string, data: CreateIncomingInvoiceData): Promise<IncomingInvoice> {
    // Get next invoice number
    const invoiceNumber = await this.getNextInvoiceNumber(userId);

    // Calculate totals from items
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

    await query('BEGIN');

    try {
      // Create invoice
      const invoiceResult = await query(
        `INSERT INTO incoming_invoices (
          user_id, vendor_id, invoice_number, vendor_invoice_number,
          invoice_date, due_date, received_date,
          vendor_name, vendor_address, vendor_vat_id, vendor_tax_number,
          vendor_iban, vendor_bic,
          subtotal, tax_amount, total, currency,
          payment_reference, payment_method,
          category_id, cost_center_id, expense_account_id,
          description, notes,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'draft')
        RETURNING *`,
        [
          userId,
          data.vendorId || null,
          invoiceNumber,
          data.vendorInvoiceNumber || null,
          data.invoiceDate || null,
          data.dueDate || null,
          data.receivedDate || new Date(),
          data.vendorName || null,
          data.vendorAddress || null,
          data.vendorVatId || null,
          data.vendorTaxNumber || null,
          data.vendorIban || null,
          data.vendorBic || null,
          subtotal,
          taxAmount,
          total,
          'EUR',
          data.paymentReference || null,
          data.paymentMethod || null,
          data.categoryId || null,
          data.costCenterId || null,
          data.expenseAccountId || null,
          data.description || null,
          data.notes || null,
        ]
      );

      const invoiceId = invoiceResult.rows[0].id;

      // Create items
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTaxAmount = itemSubtotal * ((item.taxRate || 19) / 100);
        const itemTotal = itemSubtotal + itemTaxAmount;

        await query(
          `INSERT INTO incoming_invoice_items (
            incoming_invoice_id, position, description, quantity, unit,
            unit_price, tax_rate, account_id, cost_center_id,
            subtotal, tax_amount, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            invoiceId,
            i + 1,
            item.description,
            item.quantity,
            item.unit || 'Stück',
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

      // Increment invoice number
      await this.incrementInvoiceNumber(userId);

      await query('COMMIT');

      return await this.findById(userId, invoiceId);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  // ============================================
  // UPDATE METHODS
  // ============================================

  async update(
    userId: string,
    id: string,
    data: UpdateIncomingInvoiceData
  ): Promise<IncomingInvoice> {
    const invoice = await this.findById(userId, id);

    if (!['draft', 'reviewed'].includes(invoice.status)) {
      throw new AppError('Only draft or reviewed invoices can be updated', 400);
    }

    await query('BEGIN');

    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      const fields = [
        'vendorId', 'vendorInvoiceNumber', 'invoiceDate', 'dueDate',
        'vendorName', 'vendorAddress', 'vendorVatId', 'vendorTaxNumber',
        'vendorIban', 'vendorBic', 'paymentReference', 'paymentMethod',
        'categoryId', 'costCenterId', 'expenseAccountId', 'description', 'notes',
      ];

      fields.forEach((field) => {
        const snakeField = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        if ((data as any)[field] !== undefined) {
          updates.push(`${snakeField} = $${paramIndex}`);
          params.push((data as any)[field]);
          paramIndex++;
        }
      });

      // Update items if provided
      if (data.items) {
        await query('DELETE FROM incoming_invoice_items WHERE incoming_invoice_id = $1', [id]);

        let subtotal = 0;
        let taxAmount = 0;
        let total = 0;

        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemSubtotal = item.quantity * item.unitPrice;
          const itemTaxAmount = itemSubtotal * ((item.taxRate || 19) / 100);
          const itemTotal = itemSubtotal + itemTaxAmount;

          subtotal += itemSubtotal;
          taxAmount += itemTaxAmount;
          total += itemTotal;

          await query(
            `INSERT INTO incoming_invoice_items (
              incoming_invoice_id, position, description, quantity, unit,
              unit_price, tax_rate, account_id, cost_center_id,
              subtotal, tax_amount, total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              id,
              i + 1,
              item.description,
              item.quantity,
              item.unit || 'Stück',
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
        params.push(id, userId);
        await query(
          `UPDATE incoming_invoices
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
          params
        );
      }

      await query('COMMIT');

      return await this.findById(userId, id);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async updateStatus(
    userId: string,
    id: string,
    status: IncomingInvoiceStatus
  ): Promise<IncomingInvoice> {
    const invoice = await this.findById(userId, id);

    // Validate status transitions
    const validTransitions: Record<IncomingInvoiceStatus, IncomingInvoiceStatus[]> = {
      draft: ['reviewed', 'cancelled'],
      reviewed: ['approved', 'draft', 'rejected', 'cancelled'],
      approved: ['booked', 'reviewed', 'cancelled'],
      booked: ['paid', 'cancelled'],
      paid: [],
      rejected: ['draft'],
      cancelled: [],
    };

    if (!validTransitions[invoice.status].includes(status)) {
      throw new AppError(`Cannot transition from ${invoice.status} to ${status}`, 400);
    }

    const updates: string[] = ['status = $1'];
    const params: unknown[] = [status];
    let paramIndex = 2;

    if (status === 'paid') {
      updates.push('paid_date = CURRENT_DATE');
    }

    if (status === 'booked') {
      updates.push('booked_date = CURRENT_DATE');
    }

    params.push(id, userId);

    await query(
      `UPDATE incoming_invoices
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      params
    );

    return await this.findById(userId, id);
  }

  // ============================================
  // BOOKING METHODS
  // ============================================

  async bookInvoice(userId: string, id: string): Promise<IncomingInvoice> {
    const invoice = await this.findById(userId, id);

    if (invoice.status !== 'approved') {
      throw new AppError('Only approved invoices can be booked', 400);
    }

    if (!invoice.expenseAccountId) {
      throw new AppError('Expense account must be set before booking', 400);
    }

    await query('BEGIN');

    try {
      // Get accounting settings
      const settingsResult = await query(
        'SELECT * FROM accounting_settings WHERE user_id = $1',
        [userId]
      );

      if (settingsResult.rows.length === 0) {
        throw new AppError('Accounting settings not found', 400);
      }

      const settings = settingsResult.rows[0];
      const entryNumber = `BU-${String(settings.next_journal_entry_number || 1).padStart(5, '0')}`;
      const entryDate = invoice.invoiceDate || new Date();
      const fiscalYear = new Date(entryDate).getFullYear();
      const fiscalPeriod = new Date(entryDate).getMonth() + 1;

      // Create journal entry
      const journalResult = await query(
        `INSERT INTO journal_entries (
          user_id, entry_number, entry_date, posting_date,
          fiscal_year, fiscal_period, entry_type, status,
          reference_type, reference_id, description, created_by
        ) VALUES ($1, $2, $3, $3, $4, $5, 'expense', 'posted', 'incoming_invoice', $6, $7, $1)
        RETURNING *`,
        [
          userId,
          entryNumber,
          entryDate,
          fiscalYear,
          fiscalPeriod,
          id,
          `Eingangsrechnung ${invoice.invoiceNumber}: ${invoice.vendorName || 'Unbekannter Lieferant'}`,
        ]
      );

      const journalEntryId = journalResult.rows[0].id;

      // Create journal entry lines
      // Debit: Expense account (Aufwandskonto)
      await query(
        `INSERT INTO journal_entry_lines (
          journal_entry_id, line_number, account_id, debit_amount, credit_amount,
          description, cost_center_id
        ) VALUES ($1, 1, $2, $3, 0, $4, $5)`,
        [
          journalEntryId,
          invoice.expenseAccountId,
          invoice.subtotal,
          invoice.description || `Eingangsrechnung ${invoice.invoiceNumber}`,
          invoice.costCenterId,
        ]
      );

      // Debit: Input VAT (Vorsteuer) if tax amount > 0
      if (invoice.taxAmount > 0 && settings.default_vat_receivable_account_id) {
        await query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_id, debit_amount, credit_amount,
            description, tax_amount
          ) VALUES ($1, 2, $2, $3, 0, 'Vorsteuer', $3)`,
          [
            journalEntryId,
            settings.default_vat_receivable_account_id,
            invoice.taxAmount,
          ]
        );
      }

      // Credit: Accounts Payable (Verbindlichkeiten)
      const payableAccountId = settings.default_accounts_payable_id;
      if (!payableAccountId) {
        throw new AppError('Default accounts payable not configured', 400);
      }

      await query(
        `INSERT INTO journal_entry_lines (
          journal_entry_id, line_number, account_id, debit_amount, credit_amount,
          description
        ) VALUES ($1, $2, $3, 0, $4, $5)`,
        [
          journalEntryId,
          invoice.taxAmount > 0 ? 3 : 2,
          payableAccountId,
          invoice.total,
          `Verbindlichkeit ${invoice.vendorName || ''} ${invoice.invoiceNumber}`,
        ]
      );

      // Update invoice with journal entry reference and status
      await query(
        `UPDATE incoming_invoices
         SET journal_entry_id = $1, status = 'booked', booked_date = CURRENT_DATE
         WHERE id = $2 AND user_id = $3`,
        [journalEntryId, id, userId]
      );

      // Increment journal entry number
      await query(
        `UPDATE accounting_settings
         SET next_journal_entry_number = next_journal_entry_number + 1
         WHERE user_id = $1`,
        [userId]
      );

      await query('COMMIT');

      return await this.findById(userId, id);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async markAsPaid(userId: string, id: string): Promise<IncomingInvoice> {
    const invoice = await this.findById(userId, id);

    if (invoice.status !== 'booked') {
      throw new AppError('Only booked invoices can be marked as paid', 400);
    }

    await query(
      `UPDATE incoming_invoices
       SET status = 'paid', paid_date = CURRENT_DATE
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return await this.findById(userId, id);
  }

  // ============================================
  // XML EXPORT METHODS
  // ============================================

  async generateXml(userId: string, id: string): Promise<string> {
    const invoice = await this.findById(userId, id);

    // Generate ZUGFeRD-compatible XML for incoming invoice
    const xml = this.buildZugferdXml(invoice);

    return xml;
  }

  private buildZugferdXml(invoice: IncomingInvoice): string {
    const formatDate = (date: Date | string | undefined): string => {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().split('T')[0].replace(/-/g, '');
    };

    const formatAmount = (amount: number): string => {
      return amount.toFixed(2);
    };

    const escapeXml = (str: string | undefined): string => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const items = invoice.items || [];
    const lineItems = items
      .map(
        (item, index) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${formatAmount(item.unitPrice)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${item.taxRate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${formatAmount(item.subtotal || 0)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.vendorInvoiceNumber || invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate(invoice.invoiceDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(invoice.vendorName)}</ram:Name>
        ${invoice.vendorAddress ? `<ram:PostalTradeAddress><ram:LineOne>${escapeXml(invoice.vendorAddress)}</ram:LineOne><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>` : ''}
        ${invoice.vendorVatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(invoice.vendorVatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Empfänger</ram:Name>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.currency}</ram:InvoiceCurrencyCode>
      ${invoice.vendorIban ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${escapeXml(invoice.vendorIban)}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${invoice.vendorBic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${escapeXml(invoice.vendorBic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${formatAmount(invoice.taxAmount)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${formatAmount(invoice.subtotal)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>19</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      ${invoice.dueDate ? `
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(invoice.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>` : ''}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${formatAmount(invoice.subtotal)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${formatAmount(invoice.subtotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency}">${formatAmount(invoice.taxAmount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${formatAmount(invoice.total)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${formatAmount(invoice.total)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
    ${lineItems}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
  }

  // ============================================
  // DELETE METHODS
  // ============================================

  async delete(userId: string, id: string): Promise<void> {
    const invoice = await this.findById(userId, id);

    if (!['draft', 'rejected', 'cancelled'].includes(invoice.status)) {
      throw new AppError('Only draft, rejected, or cancelled invoices can be deleted', 400);
    }

    // Delete file if exists
    if (invoice.filePath && fs.existsSync(invoice.filePath)) {
      fs.unlinkSync(invoice.filePath);
    }

    await query('DELETE FROM incoming_invoices WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(userId: string): Promise<IncomingInvoiceStats> {
    const result = await query(
      `SELECT
        COUNT(*) as total_invoices,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'booked') as booked_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COALESCE(SUM(total) FILTER (WHERE status NOT IN ('paid', 'cancelled', 'rejected')), 0) as total_unpaid,
        COALESCE(SUM(total) FILTER (WHERE status NOT IN ('paid', 'cancelled', 'rejected') AND due_date < CURRENT_DATE), 0) as total_overdue,
        COALESCE(SUM(total) FILTER (WHERE received_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as total_this_month
       FROM incoming_invoices
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];

    return {
      totalInvoices: parseInt(row.total_invoices, 10),
      draftCount: parseInt(row.draft_count, 10),
      reviewedCount: parseInt(row.reviewed_count, 10),
      approvedCount: parseInt(row.approved_count, 10),
      bookedCount: parseInt(row.booked_count, 10),
      paidCount: parseInt(row.paid_count, 10),
      totalUnpaid: parseFloat(row.total_unpaid),
      totalOverdue: parseFloat(row.total_overdue),
      totalThisMonth: parseFloat(row.total_this_month),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getNextInvoiceNumber(userId: string): Promise<string> {
    const result = await query(
      `SELECT next_incoming_invoice_number, incoming_invoice_prefix
       FROM accounting_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      await query(
        `INSERT INTO accounting_settings (user_id, next_incoming_invoice_number, incoming_invoice_prefix)
         VALUES ($1, 1, 'EIN-')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      return 'EIN-00001';
    }

    const prefix = result.rows[0].incoming_invoice_prefix || 'EIN-';
    const nextNumber = result.rows[0].next_incoming_invoice_number || 1;

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  private async incrementInvoiceNumber(userId: string): Promise<void> {
    await query(
      `UPDATE accounting_settings
       SET next_incoming_invoice_number = COALESCE(next_incoming_invoice_number, 0) + 1
       WHERE user_id = $1`,
      [userId]
    );
  }

  private mapIncomingInvoice(row: any): IncomingInvoice {
    return {
      id: row.id,
      userId: row.user_id,
      vendorId: row.vendor_id,
      invoiceNumber: row.invoice_number,
      vendorInvoiceNumber: row.vendor_invoice_number,
      status: row.status,
      invoiceDate: row.invoice_date ? new Date(row.invoice_date) : undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      receivedDate: new Date(row.received_date),
      paidDate: row.paid_date ? new Date(row.paid_date) : undefined,
      bookedDate: row.booked_date ? new Date(row.booked_date) : undefined,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.tax_amount),
      total: parseFloat(row.total),
      currency: row.currency,
      vendorName: row.vendor_name,
      vendorAddress: row.vendor_address,
      vendorVatId: row.vendor_vat_id,
      vendorTaxNumber: row.vendor_tax_number,
      vendorIban: row.vendor_iban,
      vendorBic: row.vendor_bic,
      paymentReference: row.payment_reference,
      paymentMethod: row.payment_method,
      filePath: row.file_path,
      fileType: row.file_type,
      originalFilename: row.original_filename,
      ocrRawText: row.ocr_raw_text,
      ocrConfidence: row.ocr_confidence ? parseFloat(row.ocr_confidence) : undefined,
      ocrProcessedAt: row.ocr_processed_at ? new Date(row.ocr_processed_at) : undefined,
      categoryId: row.category_id,
      costCenterId: row.cost_center_id,
      journalEntryId: row.journal_entry_id,
      expenseAccountId: row.expense_account_id,
      description: row.description,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      vendor: row.vendor_company_name
        ? { companyName: row.vendor_company_name } as any
        : undefined,
      category: row.category_name
        ? { name: row.category_name } as any
        : undefined,
      costCenter: row.cost_center_name
        ? { name: row.cost_center_name, code: row.cost_center_code } as any
        : undefined,
    };
  }

  private mapIncomingInvoiceItem(row: any): IncomingInvoiceItem {
    return {
      id: row.id,
      incomingInvoiceId: row.incoming_invoice_id,
      position: row.position,
      description: row.description,
      quantity: parseFloat(row.quantity),
      unit: row.unit,
      unitPrice: parseFloat(row.unit_price),
      taxRate: parseFloat(row.tax_rate),
      accountId: row.account_id,
      costCenterId: row.cost_center_id,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.tax_amount),
      total: parseFloat(row.total),
      createdAt: new Date(row.created_at),
      account: row.account_number
        ? { accountNumber: row.account_number, accountName: row.account_name } as any
        : undefined,
      costCenter: row.cost_center_name
        ? { name: row.cost_center_name, code: row.cost_center_code } as any
        : undefined,
    };
  }
}

export default new IncomingInvoiceService();
