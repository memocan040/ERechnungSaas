import PDFDocument from 'pdfkit';
import { query } from '../config/database';
import { Invoice, Company, Customer } from '../types';
import { companyService } from './company.service';
import { customerService } from './customer.service';

export class ZugferdService {
  async generatePdf(userId: string, invoice: Invoice): Promise<Buffer> {
    const company = await companyService.findByUserId(userId);
    const customer = await customerService.findById(userId, invoice.customerId);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('RECHNUNG', { align: 'right' });
        doc.moveDown(0.5);

        // Company Info (left side)
        if (company) {
          doc.fontSize(10).font('Helvetica');
          doc.text(company.name, 50, 100);
          if (company.street && company.houseNumber) {
            doc.text(`${company.street} ${company.houseNumber}`);
          }
          if (company.postalCode && company.city) {
            doc.text(`${company.postalCode} ${company.city}`);
          }
          if (company.country) {
            doc.text(company.country);
          }
          doc.moveDown();
          if (company.phone) doc.text(`Tel: ${company.phone}`);
          if (company.email) doc.text(`E-Mail: ${company.email}`);
          if (company.website) doc.text(`Web: ${company.website}`);
        }

        // Invoice Info (right side)
        doc.fontSize(10).font('Helvetica');
        doc.text(`Rechnungsnummer: ${invoice.invoiceNumber}`, 350, 100);
        doc.text(`Rechnungsdatum: ${this.formatDate(invoice.issueDate)}`);
        doc.text(`Fälligkeitsdatum: ${this.formatDate(invoice.dueDate)}`);

        // Customer Address
        doc.fontSize(10).font('Helvetica');
        doc.text('Rechnungsempfänger:', 50, 220);
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text(customer.companyName);
        doc.font('Helvetica');
        if (customer.contactName) doc.text(customer.contactName);
        if (customer.street && customer.houseNumber) {
          doc.text(`${customer.street} ${customer.houseNumber}`);
        }
        if (customer.postalCode && customer.city) {
          doc.text(`${customer.postalCode} ${customer.city}`);
        }
        if (customer.vatId) doc.text(`USt-IdNr.: ${customer.vatId}`);

        // Items Table
        const tableTop = 350;
        const tableHeaders = ['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'MwSt.', 'Gesamt'];
        const colWidths = [30, 180, 50, 50, 70, 50, 70];
        let currentX = 50;

        // Table Header
        doc.font('Helvetica-Bold').fontSize(9);
        doc.fillColor('#f0f0f0').rect(50, tableTop - 5, 500, 20).fill();
        doc.fillColor('#000000');

        tableHeaders.forEach((header, i) => {
          doc.text(header, currentX, tableTop, { width: colWidths[i], align: i > 1 ? 'right' : 'left' });
          currentX += colWidths[i];
        });

        // Table Rows
        doc.font('Helvetica').fontSize(9);
        let y = tableTop + 25;

        if (invoice.items) {
          for (const item of invoice.items) {
            currentX = 50;

            doc.text(item.position.toString(), currentX, y, { width: colWidths[0] });
            currentX += colWidths[0];

            doc.text(item.description, currentX, y, { width: colWidths[1] });
            currentX += colWidths[1];

            doc.text(item.quantity.toString(), currentX, y, { width: colWidths[2], align: 'right' });
            currentX += colWidths[2];

            doc.text(item.unit, currentX, y, { width: colWidths[3], align: 'right' });
            currentX += colWidths[3];

            doc.text(this.formatCurrency(item.unitPrice), currentX, y, { width: colWidths[4], align: 'right' });
            currentX += colWidths[4];

            doc.text(`${item.taxRate}%`, currentX, y, { width: colWidths[5], align: 'right' });
            currentX += colWidths[5];

            doc.text(this.formatCurrency(item.total), currentX, y, { width: colWidths[6], align: 'right' });

            y += 20;
          }
        }

        // Totals
        const totalsY = y + 30;
        doc.moveTo(350, totalsY - 10).lineTo(550, totalsY - 10).stroke();

        doc.font('Helvetica').fontSize(10);
        doc.text('Zwischensumme (netto):', 350, totalsY, { width: 130 });
        doc.text(this.formatCurrency(invoice.subtotal), 480, totalsY, { width: 70, align: 'right' });

        doc.text(`MwSt.:`, 350, totalsY + 20, { width: 130 });
        doc.text(this.formatCurrency(invoice.taxAmount), 480, totalsY + 20, { width: 70, align: 'right' });

        doc.font('Helvetica-Bold');
        doc.text('Gesamtbetrag (brutto):', 350, totalsY + 45, { width: 130 });
        doc.text(this.formatCurrency(invoice.total), 480, totalsY + 45, { width: 70, align: 'right' });

        // Payment Terms, Bank Info & Notes
        let currentY = totalsY + 80;

        if (invoice.paymentTerms) {
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('Zahlungsbedingungen:', 50, currentY);
          currentY += 15;
          doc.font('Helvetica').fontSize(9);
          doc.text(invoice.paymentTerms, 50, currentY, { width: 250 });
          currentY += 30;
        }

        if (company && (company.bankName || company.iban)) {
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('Bankverbindung:', 50, currentY);
          currentY += 15;
          
          doc.font('Helvetica').fontSize(9);
          if (company.bankName) {
            doc.text(`Bank: ${company.bankName}`, 50, currentY);
            currentY += 15;
          }
          if (company.iban) {
            doc.text(`IBAN: ${company.iban}`, 50, currentY);
            currentY += 15;
          }
          if (company.bic) {
            doc.text(`BIC: ${company.bic}`, 50, currentY);
            currentY += 15;
          }
          currentY += 15;
        }

        if (invoice.notes) {
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('Hinweise:', 50, currentY);
          currentY += 15;
          doc.font('Helvetica').fontSize(9);
          doc.text(invoice.notes, 50, currentY, { width: 250 });
        }

        // Footer
        const footerY = 780;
        doc.fontSize(8).fillColor('#666666');
        if (company) {
          const footerParts = [];
          if (company.managingDirector) footerParts.push(`Geschäftsführer: ${company.managingDirector}`);
          if (company.vatId) footerParts.push(`USt-IdNr.: ${company.vatId}`);
          if (company.tradeRegister) footerParts.push(`${company.tradeRegister}`);
          if (company.court) footerParts.push(`${company.court}`);

          doc.text(footerParts.join(' | '), 50, footerY, { align: 'center', width: 500 });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateXml(userId: string, invoice: Invoice): Promise<string> {
    const company = await companyService.findByUserId(userId);
    const customer = await customerService.findById(userId, invoice.customerId);

    // ZUGFeRD 2.1 Basic XML Structure
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${this.escapeXml(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${this.formatDateForXml(invoice.issueDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${this.escapeXml(company?.name || '')}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.escapeXml(company?.postalCode || '')}</ram:PostcodeCode>
          <ram:LineOne>${this.escapeXml((company?.street || '') + ' ' + (company?.houseNumber || ''))}</ram:LineOne>
          <ram:CityName>${this.escapeXml(company?.city || '')}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${company?.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${this.escapeXml(company.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${this.escapeXml(customer.companyName)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.escapeXml(customer.postalCode || '')}</ram:PostcodeCode>
          <ram:LineOne>${this.escapeXml((customer.street || '') + ' ' + (customer.houseNumber || ''))}</ram:LineOne>
          <ram:CityName>${this.escapeXml(customer.city || '')}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${customer.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${this.escapeXml(customer.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.currency}</ram:InvoiceCurrencyCode>
      ${company?.iban ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${this.escapeXml(company.iban)}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${company.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${this.escapeXml(company.bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${invoice.taxAmount.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${invoice.subtotal.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>19.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${this.formatDateForXml(invoice.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${invoice.subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${invoice.subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency}">${invoice.taxAmount.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${invoice.total.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${invoice.total.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
    ${invoice.items?.map((item, index) => `<ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${this.escapeXml(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unitPrice.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${this.getUnitCode(item.unit)}">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${item.taxRate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${item.subtotal.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('\n') || ''}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    return xml;
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE');
  }

  private formatDateForXml(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0].replace(/-/g, '');
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private getUnitCode(unit: string): string {
    const unitMapping: Record<string, string> = {
      'Stück': 'C62',
      'Stunde': 'HUR',
      'Tag': 'DAY',
      'Monat': 'MON',
      'Pauschal': 'LS',
      'kg': 'KGM',
      'm': 'MTR',
      'm²': 'MTK',
      'Liter': 'LTR',
    };
    return unitMapping[unit] || 'C62';
  }
}

export const zugferdService = new ZugferdService();
