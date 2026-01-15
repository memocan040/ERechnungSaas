import { XMLParser } from 'fast-xml-parser';
import { ParsedInvoiceData, ValidationResult, ImportResult, XmlParserOptions } from '../types/xml-import.types';
import { Invoice, InvoiceItem } from '../types';
import pool from '../config/database';
import { customerService } from './customer.service';
import { invoiceService } from './invoice.service';
import { ZugferdService } from './zugferd.service';

class XmlImportService {
  private parser: XMLParser;
  private zugferdService: ZugferdService;

  constructor() {
    const parserOptions: XmlParserOptions = {
      ignoreAttributes: false,
      removeNSPrefix: true, // Removes rsm:, ram:, udt: prefixes
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      processEntities: false, // Security: prevent XXE attacks
    };
    this.parser = new XMLParser(parserOptions);
    this.zugferdService = new ZugferdService();
  }

  /**
   * Parse XML content and extract invoice data
   */
  async parseXml(userId: string, xmlContent: string): Promise<ParsedInvoiceData> {
    try {
      // Parse XML
      const parsedXml = this.parser.parse(xmlContent);

      // Validate XML structure
      if (!parsedXml.CrossIndustryInvoice) {
        throw new Error('Invalid XML structure: Missing CrossIndustryInvoice root element');
      }

      const invoice = parsedXml.CrossIndustryInvoice;
      const exchangedDoc = invoice.ExchangedDocument;
      const transaction = invoice.SupplyChainTradeTransaction;

      if (!exchangedDoc || !transaction) {
        throw new Error('Invalid XML structure: Missing required elements');
      }

      // Extract invoice data
      const invoiceData = this.extractInvoiceData(exchangedDoc, transaction);

      // Extract customer data
      const customerData = this.extractCustomerData(transaction.ApplicableHeaderTradeAgreement?.BuyerTradeParty);

      // Extract line items
      const items = this.extractLineItems(transaction.IncludedSupplyChainTradeLineItem);

      // Check if customer exists
      let existingCustomer = null;
      if (customerData.vatId) {
        existingCustomer = await customerService.findByVatIdOrName(userId, customerData.vatId);
      }
      if (!existingCustomer && customerData.companyName && customerData.postalCode) {
        existingCustomer = await customerService.findByVatIdOrName(
          userId,
          undefined,
          customerData.companyName,
          customerData.postalCode
        );
      }

      const parsedData: ParsedInvoiceData = {
        invoice: invoiceData,
        customer: {
          ...customerData,
          existingCustomerId: existingCustomer?.id,
          isNewCustomer: !existingCustomer,
        },
        items,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
      };

      // Validate the parsed data
      const validation = await this.validateParsedData(userId, parsedData);
      parsedData.validation = validation;

      return parsedData;
    } catch (error) {
      throw new Error(`XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract invoice data from XML
   */
  private extractInvoiceData(exchangedDoc: any, transaction: any): ParsedInvoiceData['invoice'] {
    const settlement = transaction.ApplicableHeaderTradeSettlement;
    const monetarySummation = settlement?.SpecifiedTradeSettlementHeaderMonetarySummation;
    const paymentTerms = settlement?.SpecifiedTradePaymentTerms;
    const includedNote = settlement?.IncludedNote;

    return {
      invoiceNumber: exchangedDoc.ID || '',
      issueDate: this.parseXmlDate(exchangedDoc.IssueDateTime?.DateTimeString),
      dueDate: this.parseXmlDate(paymentTerms?.DueDateDateTime?.DateTimeString),
      currency: settlement?.InvoiceCurrencyCode || 'EUR',
      subtotal: parseFloat(monetarySummation?.LineTotalAmount || '0'),
      taxAmount: parseFloat(monetarySummation?.TaxTotalAmount || '0'),
      total: parseFloat(monetarySummation?.GrandTotalAmount || '0'),
      paymentTerms: paymentTerms?.Description || undefined,
      notes: includedNote?.Content || undefined,
    };
  }

  /**
   * Extract customer data from XML
   */
  private extractCustomerData(buyerParty: any): Omit<ParsedInvoiceData['customer'], 'existingCustomerId' | 'isNewCustomer'> {
    if (!buyerParty) {
      throw new Error('Missing buyer party information');
    }

    const address = buyerParty.PostalTradeAddress || {};
    const contactInfo = buyerParty.DefinedTradeContact || {};
    const vatRegistration = Array.isArray(buyerParty.SpecifiedTaxRegistration)
      ? buyerParty.SpecifiedTaxRegistration.find((reg: any) => reg.ID?.['@_schemeID'] === 'VA')
      : buyerParty.SpecifiedTaxRegistration;

    const email = buyerParty.URIUniversalCommunication?.URIID;
    const phone = contactInfo.TelephoneUniversalCommunication?.CompleteNumber;

    // Parse street and house number from LineOne
    const lineOne = address.LineOne || '';
    const { street, houseNumber } = this.parseAddress(lineOne);

    return {
      companyName: buyerParty.Name || '',
      street,
      houseNumber,
      postalCode: address.PostcodeCode || '',
      city: address.CityName || '',
      country: this.mapCountryCode(address.CountryID) || 'Deutschland',
      vatId: vatRegistration?.ID || undefined,
      email: typeof email === 'string' ? email : undefined,
      phone: typeof phone === 'string' ? phone : undefined,
    };
  }

  /**
   * Extract line items from XML
   */
  private extractLineItems(lineItems: any): ParsedInvoiceData['items'] {
    if (!lineItems) {
      return [];
    }

    // Handle both single item and array of items
    const items = Array.isArray(lineItems) ? lineItems : [lineItems];

    return items.map((item: any, index: number) => {
      const lineDoc = item.AssociatedDocumentLineDocument;
      const product = item.SpecifiedTradeProduct;
      const agreement = item.SpecifiedLineTradeAgreement;
      const delivery = item.SpecifiedLineTradeDelivery;
      const settlement = item.SpecifiedLineTradeSettlement;

      const quantity = parseFloat(delivery?.BilledQuantity || '1');
      const unitCode = delivery?.BilledQuantity?.['@_unitCode'] || 'C62';
      const unit = this.mapUnitCode(unitCode);
      const unitPrice = parseFloat(agreement?.NetPriceProductTradePrice?.ChargeAmount || '0');
      const taxRate = parseFloat(settlement?.ApplicableTradeTax?.RateApplicablePercent || '0');
      const subtotal = parseFloat(settlement?.SpecifiedTradeSettlementLineMonetarySummation?.LineTotalAmount || '0');
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;

      return {
        position: parseInt(lineDoc?.LineID || (index + 1).toString()),
        description: product?.Name || '',
        quantity,
        unit,
        unitPrice,
        taxRate,
        subtotal,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      };
    });
  }

  /**
   * Validate parsed data
   */
  private async validateParsedData(userId: string, data: ParsedInvoiceData): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.invoice.invoiceNumber) {
      errors.push('Rechnungsnummer fehlt');
    }
    if (!data.invoice.issueDate) {
      errors.push('Ausstellungsdatum fehlt');
    }
    if (!data.customer.companyName) {
      errors.push('Kundenname fehlt');
    }
    if (data.items.length === 0) {
      errors.push('Keine Rechnungspositionen gefunden');
    }

    // Check for duplicate invoice number
    if (data.invoice.invoiceNumber) {
      const isDuplicate = await this.checkDuplicateInvoice(userId, data.invoice.invoiceNumber);
      if (isDuplicate) {
        errors.push(`Rechnungsnummer "${data.invoice.invoiceNumber}" existiert bereits`);
      }
    }

    // Validate calculations
    const calculatedSubtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    const calculatedTaxAmount = data.items.reduce((sum, item) => sum + item.taxAmount, 0);
    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

    const subtotalDiff = Math.abs(calculatedSubtotal - data.invoice.subtotal);
    const taxDiff = Math.abs(calculatedTaxAmount - data.invoice.taxAmount);
    const totalDiff = Math.abs(calculatedTotal - data.invoice.total);

    if (subtotalDiff > 0.02) {
      warnings.push(`Nettosumme weicht ab: erwartet ${calculatedSubtotal.toFixed(2)} €, gefunden ${data.invoice.subtotal.toFixed(2)} €`);
    }
    if (taxDiff > 0.02) {
      warnings.push(`Steuerbetrag weicht ab: erwartet ${calculatedTaxAmount.toFixed(2)} €, gefunden ${data.invoice.taxAmount.toFixed(2)} €`);
    }
    if (totalDiff > 0.02) {
      warnings.push(`Gesamtbetrag weicht ab: erwartet ${calculatedTotal.toFixed(2)} €, gefunden ${data.invoice.total.toFixed(2)} €`);
    }

    // Date validation
    if (data.invoice.issueDate > new Date()) {
      warnings.push('Ausstellungsdatum liegt in der Zukunft');
    }
    if (data.invoice.dueDate && data.invoice.issueDate > data.invoice.dueDate) {
      errors.push('Fälligkeitsdatum liegt vor dem Ausstellungsdatum');
    }

    // Tax rate validation
    for (const item of data.items) {
      if (item.taxRate < 0 || item.taxRate > 100) {
        errors.push(`Ungültiger Steuersatz bei Position ${item.position}: ${item.taxRate}%`);
      }
    }

    // Customer warnings
    if (data.customer.isNewCustomer) {
      warnings.push('Kunde nicht gefunden - wird neu angelegt');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if invoice number already exists
   */
  async checkDuplicateInvoice(userId: string, invoiceNumber: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM invoices WHERE user_id = $1 AND invoice_number = $2',
      [userId, invoiceNumber]
    );
    return result.rows.length > 0;
  }

  /**
   * Execute the import (create invoice and customer if needed)
   */
  async executeImport(userId: string, xmlContent: string, parsedData?: ParsedInvoiceData): Promise<ImportResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Parse XML if not already parsed
      if (!parsedData) {
        parsedData = await this.parseXml(userId, xmlContent);
      }

      // Validate again
      if (!parsedData.validation.isValid) {
        throw new Error(`Validierung fehlgeschlagen: ${parsedData.validation.errors.join(', ')}`);
      }

      // 1. Create or find customer
      let customerId: string;
      let customerWasCreated = false;

      if (parsedData.customer.existingCustomerId) {
        customerId = parsedData.customer.existingCustomerId;
      } else {
        // Create new customer
        const newCustomer = await customerService.createFromImport(userId, {
          companyName: parsedData.customer.companyName,
          street: parsedData.customer.street,
          houseNumber: parsedData.customer.houseNumber,
          postalCode: parsedData.customer.postalCode,
          city: parsedData.customer.city,
          country: parsedData.customer.country,
          vatId: parsedData.customer.vatId,
          email: parsedData.customer.email,
          phone: parsedData.customer.phone,
        });
        customerId = newCustomer.id;
        customerWasCreated = true;
      }

      // 2. Create invoice
      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          user_id, customer_id, invoice_number, status, issue_date, due_date,
          subtotal, tax_amount, total, currency, notes, payment_terms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          userId,
          customerId,
          parsedData.invoice.invoiceNumber,
          'draft',
          parsedData.invoice.issueDate,
          parsedData.invoice.dueDate,
          parsedData.invoice.subtotal,
          parsedData.invoice.taxAmount,
          parsedData.invoice.total,
          parsedData.invoice.currency,
          parsedData.invoice.notes,
          parsedData.invoice.paymentTerms,
        ]
      );

      const createdInvoice = invoiceResult.rows[0];

      // 3. Create invoice items
      for (const item of parsedData.items) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, position, description, quantity, unit, unit_price,
            tax_rate, subtotal, tax_amount, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            createdInvoice.id,
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

      // 4. Generate and store XML
      const invoiceWithItems: Invoice = {
        ...createdInvoice,
        items: parsedData.items.map((item: any) => ({
          ...item,
          invoiceId: createdInvoice.id,
          id: '', // Will be set by database
        })) as InvoiceItem[],
      };

      const generatedXml = await this.zugferdService.generateXml(userId, invoiceWithItems);
      await client.query('UPDATE invoices SET xml_data = $1 WHERE id = $2', [generatedXml, createdInvoice.id]);

      await client.query('COMMIT');

      // Get complete invoice with relations
      const completeInvoice = await invoiceService.findById(userId, createdInvoice.id);
      const customer = await customerService.findById(userId, customerId);

      return {
        success: true,
        invoice: completeInvoice || undefined,
        customer: customer ? { ...customer, wasCreated: customerWasCreated } : undefined,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        details: {
          code: 'IMPORT_ERROR',
          message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        },
      };
    } finally {
      client.release();
    }
  }

  /**
   * Parse XML date format (YYYYMMDD) to JavaScript Date
   */
  private parseXmlDate(dateString: string | undefined): Date {
    if (!dateString || typeof dateString !== 'string') {
      return new Date();
    }

    // Remove any non-numeric characters
    const cleanDate = dateString.replace(/\D/g, '');

    if (cleanDate.length !== 8) {
      return new Date();
    }

    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(cleanDate.substring(6, 8));

    return new Date(year, month, day);
  }

  /**
   * Map UN/ECE unit code to German unit name
   */
  private mapUnitCode(unitCode: string): string {
    const unitMapping: Record<string, string> = {
      'C62': 'Stück',
      'HUR': 'Stunde',
      'DAY': 'Tag',
      'MON': 'Monat',
      'LS': 'Pauschal',
      'KGM': 'kg',
      'MTR': 'm',
      'MTK': 'm²',
      'LTR': 'Liter',
    };
    return unitMapping[unitCode] || 'Stück';
  }

  /**
   * Map country code to German country name
   */
  private mapCountryCode(countryCode: string | undefined): string {
    if (!countryCode) return 'Deutschland';
    const mapping: Record<string, string> = {
      'DE': 'Deutschland',
      'AT': 'Österreich',
      'CH': 'Schweiz',
    };
    return mapping[countryCode] || 'Deutschland';
  }

  /**
   * Parse address string into street and house number
   */
  private parseAddress(address: string): { street?: string; houseNumber?: string } {
    if (!address) return {};

    // Try to match house number at the end (e.g., "Hauptstraße 123" or "Hauptstraße 123a")
    const match = address.match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);

    if (match) {
      return {
        street: match[1].trim(),
        houseNumber: match[2].trim(),
      };
    }

    // If no match, return the whole string as street
    return {
      street: address.trim(),
      houseNumber: undefined,
    };
  }
}

export default new XmlImportService();
