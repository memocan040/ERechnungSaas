import PDFDocument from 'pdfkit';
import { query } from '../config/database';
import { Invoice, Company, Customer } from '../types';
import { companyService } from './company.service';
import { customerService } from './customer.service';
import { invoiceDesignService } from './invoice-design.service';
import fs from 'fs';
import path from 'path';

export class ZugferdService {
  async generatePdf(userId: string, invoice: Invoice): Promise<Buffer> {
    const company = await companyService.findByUserId(userId);
    const customer = await customerService.findById(userId, invoice.customerId);

    // Load design settings
    let designSettings = await invoiceDesignService.findByUserId(userId);
    if (!designSettings) {
      // Create default settings if none exist
      designSettings = await invoiceDesignService.createOrUpdate(userId, {});
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: designSettings.pageMarginTop,
            bottom: designSettings.pageMarginBottom,
            left: designSettings.pageMarginLeft,
            right: designSettings.pageMarginRight,
          }
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const marginLeft = designSettings.pageMarginLeft;
        const marginRight = designSettings.pageMarginRight;
        const pageWidth = 595.28; // A4 width in points
        const contentWidth = pageWidth - marginLeft - marginRight;

        // Logo rendering
        let logoHeight = 0;
        if (designSettings.showLogo && designSettings.showCompanyLogo && company?.logoUrl) {
          try {
            const logoPath = path.join(__dirname, '../../uploads/logos', path.basename(company.logoUrl));
            if (fs.existsSync(logoPath)) {
              const logoSizeMap = { small: 40, medium: 60, large: 80 };
              logoHeight = logoSizeMap[designSettings.logoSize];

              let logoX = marginLeft;
              if (designSettings.logoPosition === 'center') {
                logoX = (pageWidth - logoHeight) / 2;
              } else if (designSettings.logoPosition === 'right') {
                logoX = pageWidth - marginRight - logoHeight;
              }

              doc.image(logoPath, logoX, 50, { height: logoHeight });
            }
          } catch (error) {
            console.error('Error rendering logo:', error);
          }
        }

        const headerStartY = logoHeight > 0 ? 50 + logoHeight + designSettings.sectionSpacing : 80;

        // Header
        doc.fillColor(designSettings.primaryColor)
           .fontSize(designSettings.headerFontSize)
           .font(`${designSettings.fontFamily}-Bold`)
           .text('RECHNUNG', marginLeft, headerStartY, { align: 'right', width: contentWidth });
        doc.moveDown(0.5);

        // Company Info (left side) and Invoice Info (right side)
        const infoStartY = headerStartY + 40;

        if (designSettings.companyInfoPosition === 'left') {
          // Company Info on left
          if (company) {
            doc.fillColor(designSettings.textColor)
               .fontSize(designSettings.bodyFontSize)
               .font(designSettings.fontFamily);
            doc.text(company.name, marginLeft, infoStartY);
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

          // Invoice Info on right
          doc.fillColor(designSettings.textColor)
             .fontSize(designSettings.bodyFontSize)
             .font(designSettings.fontFamily);
          doc.text(`Rechnungsnummer: ${invoice.invoiceNumber}`, pageWidth - marginRight - 200, infoStartY, { width: 200 });
          doc.text(`Rechnungsdatum: ${this.formatDate(invoice.issueDate)}`);
          doc.text(`Fälligkeitsdatum: ${this.formatDate(invoice.dueDate)}`);
        } else {
          // Company Info on right
          if (company) {
            doc.fillColor(designSettings.textColor)
               .fontSize(designSettings.bodyFontSize)
               .font(designSettings.fontFamily);
            doc.text(company.name, pageWidth - marginRight - 200, infoStartY, { width: 200 });
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

          // Invoice Info on left
          doc.fillColor(designSettings.textColor)
             .fontSize(designSettings.bodyFontSize)
             .font(designSettings.fontFamily);
          doc.text(`Rechnungsnummer: ${invoice.invoiceNumber}`, marginLeft, infoStartY);
          doc.text(`Rechnungsdatum: ${this.formatDate(invoice.issueDate)}`);
          doc.text(`Fälligkeitsdatum: ${this.formatDate(invoice.dueDate)}`);
        }

        // Customer Address
        const customerStartY = infoStartY + 120;
        doc.fillColor(designSettings.textColor)
           .fontSize(designSettings.bodyFontSize)
           .font(designSettings.fontFamily);
        doc.text('Rechnungsempfänger:', marginLeft, customerStartY);
        doc.moveDown(0.3);
        doc.font(`${designSettings.fontFamily}-Bold`).text(customer.companyName);
        doc.font(designSettings.fontFamily);
        if (customer.contactName) doc.text(customer.contactName);
        if (customer.street && customer.houseNumber) {
          doc.text(`${customer.street} ${customer.houseNumber}`);
        }
        if (customer.postalCode && customer.city) {
          doc.text(`${customer.postalCode} ${customer.city}`);
        }
        if (customer.vatId) doc.text(`USt-IdNr.: ${customer.vatId}`);

        // Items Table
        const tableTop = customerStartY + 130;
        const tableHeaders = ['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'MwSt.', 'Gesamt'];
        const colWidths = [30, 180, 50, 50, 70, 50, 70];
        let currentX = marginLeft;

        // Table Header
        doc.font(`${designSettings.fontFamily}-Bold`).fontSize(designSettings.bodyFontSize - 1);
        doc.fillColor(designSettings.tableHeaderBg).rect(marginLeft, tableTop - 5, contentWidth, 20).fill();
        doc.fillColor(designSettings.textColor);

        tableHeaders.forEach((header, i) => {
          doc.text(header, currentX, tableTop, { width: colWidths[i], align: i > 1 ? 'right' : 'left' });
          currentX += colWidths[i];
        });

        // Table Rows
        doc.font(designSettings.fontFamily).fontSize(designSettings.bodyFontSize - 1);
        let y = tableTop + 25;

        if (invoice.items) {
          for (const item of invoice.items) {
            currentX = marginLeft;

            doc.fillColor(designSettings.textColor);
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
        doc.fillColor(designSettings.textColor);
        doc.moveTo(pageWidth - marginRight - 200, totalsY - 10).lineTo(pageWidth - marginRight, totalsY - 10).stroke();

        doc.font(designSettings.fontFamily).fontSize(designSettings.bodyFontSize);
        doc.text('Zwischensumme (netto):', pageWidth - marginRight - 200, totalsY, { width: 130 });
        doc.text(this.formatCurrency(invoice.subtotal), pageWidth - marginRight - 70, totalsY, { width: 70, align: 'right' });

        doc.text(`MwSt.:`, pageWidth - marginRight - 200, totalsY + 20, { width: 130 });
        doc.text(this.formatCurrency(invoice.taxAmount), pageWidth - marginRight - 70, totalsY + 20, { width: 70, align: 'right' });

        doc.font(`${designSettings.fontFamily}-Bold`);
        doc.text('Gesamtbetrag (brutto):', pageWidth - marginRight - 200, totalsY + 45, { width: 130 });
        doc.text(this.formatCurrency(invoice.total), pageWidth - marginRight - 70, totalsY + 45, { width: 70, align: 'right' });

        // Payment Terms, Bank Info & Notes
        let currentY = totalsY + 80;

        if (invoice.paymentTerms) {
          doc.fillColor(designSettings.textColor)
             .font(`${designSettings.fontFamily}-Bold`)
             .fontSize(designSettings.bodyFontSize - 1);
          doc.text('Zahlungsbedingungen:', marginLeft, currentY);
          currentY += 15;
          doc.font(designSettings.fontFamily).fontSize(designSettings.bodyFontSize - 1);
          doc.text(invoice.paymentTerms, marginLeft, currentY, { width: 250 });
          currentY += 30;
        }

        if (designSettings.showBankInfo && company && (company.bankName || company.iban)) {
          doc.fillColor(designSettings.textColor)
             .font(`${designSettings.fontFamily}-Bold`)
             .fontSize(designSettings.bodyFontSize - 1);
          doc.text('Bankverbindung:', marginLeft, currentY);
          currentY += 15;

          doc.font(designSettings.fontFamily).fontSize(designSettings.bodyFontSize - 1);
          if (company.bankName) {
            doc.text(`Bank: ${company.bankName}`, marginLeft, currentY);
            currentY += 15;
          }
          if (company.iban) {
            doc.text(`IBAN: ${company.iban}`, marginLeft, currentY);
            currentY += 15;
          }
          if (company.bic) {
            doc.text(`BIC: ${company.bic}`, marginLeft, currentY);
            currentY += 15;
          }
          currentY += 15;
        }

        if (invoice.notes) {
          doc.fillColor(designSettings.textColor)
             .font(`${designSettings.fontFamily}-Bold`)
             .fontSize(designSettings.bodyFontSize - 1);
          doc.text('Hinweise:', marginLeft, currentY);
          currentY += 15;
          doc.font(designSettings.fontFamily).fontSize(designSettings.bodyFontSize - 1);
          doc.text(invoice.notes, marginLeft, currentY, { width: 250 });
        }

        // Footer
        if (designSettings.showFooterInfo) {
          const footerY = 780;
          doc.fontSize(designSettings.footerFontSize).fillColor(designSettings.secondaryColor);
          if (company) {
            const footerParts = [];
            if (company.managingDirector) footerParts.push(`Geschäftsführer: ${company.managingDirector}`);
            if (company.vatId) footerParts.push(`USt-IdNr.: ${company.vatId}`);
            if (company.tradeRegister) footerParts.push(`${company.tradeRegister}`);
            if (company.court) footerParts.push(`${company.court}`);

            doc.text(footerParts.join(' | '), marginLeft, footerY, { align: 'center', width: contentWidth });
          }
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

    // Calculate tax breakdown by tax rate
    const taxBreakdown = this.calculateTaxBreakdown(invoice.items || []);

    // XRechnung / ZUGFeRD 2.1 EXTENDED XML Structure (DATEV compatible)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      <ram:ID>A1</ram:ID>
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
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
        ${company?.legalName ? `<ram:Description>${this.escapeXml(company.legalName)}</ram:Description>` : ''}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.escapeXml(company?.postalCode || '')}</ram:PostcodeCode>
          <ram:LineOne>${this.escapeXml((company?.street || '') + ' ' + (company?.houseNumber || ''))}</ram:LineOne>
          <ram:CityName>${this.escapeXml(company?.city || '')}</ram:CityName>
          <ram:CountryID>${company?.country === 'Deutschland' ? 'DE' : 'DE'}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${company?.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${this.escapeXml(company.email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
        ${company?.phone ? `<ram:DefinedTradeContact><ram:TelephoneUniversalCommunication><ram:CompleteNumber>${this.escapeXml(company.phone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication></ram:DefinedTradeContact>` : ''}
        ${company?.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${this.escapeXml(company.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
        ${company?.taxNumber ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${this.escapeXml(company.taxNumber)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
        ${company?.tradeRegister ? `<ram:SpecifiedLegalOrganization><ram:TradingBusinessName>${this.escapeXml(company.tradeRegister)}</ram:TradingBusinessName></ram:SpecifiedLegalOrganization>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${this.escapeXml(customer.companyName)}</ram:Name>
        ${customer.contactName ? `<ram:DefinedTradeContact><ram:PersonName>${this.escapeXml(customer.contactName)}</ram:PersonName></ram:DefinedTradeContact>` : ''}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.escapeXml(customer.postalCode || '')}</ram:PostcodeCode>
          <ram:LineOne>${this.escapeXml((customer.street || '') + ' ' + (customer.houseNumber || ''))}</ram:LineOne>
          <ram:CityName>${this.escapeXml(customer.city || '')}</ram:CityName>
          <ram:CountryID>${customer.country === 'Deutschland' ? 'DE' : 'DE'}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${customer.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${this.escapeXml(customer.email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
        ${customer.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${this.escapeXml(customer.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${this.formatDateForXml(invoice.issueDate)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.currency}</ram:InvoiceCurrencyCode>
      ${company?.iban ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:Information>Überweisung</ram:Information>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${this.escapeXml(company.iban)}</ram:IBANID>
          ${company.bankName ? `<ram:AccountName>${this.escapeXml(company.bankName)}</ram:AccountName>` : ''}
        </ram:PayeePartyCreditorFinancialAccount>
        ${company.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${this.escapeXml(company.bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      ${taxBreakdown.map(tax => `<ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${tax.taxAmount.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${tax.basisAmount.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${tax.taxRate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`).join('\n      ')}
      <ram:SpecifiedTradePaymentTerms>
        ${invoice.paymentTerms ? `<ram:Description>${this.escapeXml(invoice.paymentTerms)}</ram:Description>` : ''}
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${this.formatDateForXml(invoice.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      ${invoice.notes ? `<ram:IncludedNote>
        <ram:Content>${this.escapeXml(invoice.notes)}</ram:Content>
      </ram:IncludedNote>` : ''}
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

  private calculateTaxBreakdown(items: Array<{ taxRate: number; subtotal: number; taxAmount: number }>): Array<{
    taxRate: number;
    basisAmount: number;
    taxAmount: number;
  }> {
    const taxMap = new Map<number, { basisAmount: number; taxAmount: number }>();

    for (const item of items) {
      const existing = taxMap.get(item.taxRate) || { basisAmount: 0, taxAmount: 0 };
      taxMap.set(item.taxRate, {
        basisAmount: existing.basisAmount + item.subtotal,
        taxAmount: existing.taxAmount + item.taxAmount,
      });
    }

    return Array.from(taxMap.entries()).map(([taxRate, amounts]) => ({
      taxRate,
      ...amounts,
    }));
  }
}

export const zugferdService = new ZugferdService();
