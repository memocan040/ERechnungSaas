import PDFDocument from 'pdfkit';
import { Quote, Company, Customer } from '../types';
import { companyService } from './company.service';
import { customerService } from './customer.service';
import { invoiceDesignService } from './invoice-design.service';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export class QuotePdfService {
  async generatePdf(userId: string, quote: Quote): Promise<Buffer> {
    const company = await companyService.findByUserId(userId);
    const customer = await customerService.findById(userId, quote.customerId);

    // Load design settings (reuse invoice design settings)
    let designSettings = await invoiceDesignService.findByUserId(userId);
    if (!designSettings) {
      designSettings = await invoiceDesignService.createOrUpdate(userId, {});
    }

    // Generate QR code buffer before PDF creation (async)
    let qrBuffer: Buffer | null = null;
    if (designSettings.showQrCode && company?.iban) {
      try {
        const epcQrData = this.generateEpcQrData(company, quote);
        qrBuffer = await QRCode.toBuffer(epcQrData, {
          type: 'png',
          width: 80,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
      }
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

        // Header - ANGEBOT instead of RECHNUNG
        doc.fillColor(designSettings.primaryColor)
           .fontSize(designSettings.headerFontSize)
           .font(`${designSettings.fontFamily}-Bold`)
           .text('ANGEBOT', marginLeft, headerStartY, { align: 'right', width: contentWidth });
        doc.moveDown(0.5);

        // Company Info (left side) and Quote Info (right side)
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

          // Quote Info on right
          doc.fillColor(designSettings.textColor)
             .fontSize(designSettings.bodyFontSize)
             .font(designSettings.fontFamily);
          doc.text(`Angebotsnummer: ${quote.quoteNumber}`, pageWidth - marginRight - 200, infoStartY, { width: 200 });
          doc.text(`Angebotsdatum: ${this.formatDate(quote.issueDate)}`);
          doc.text(`Gültig bis: ${this.formatDate(quote.validUntil)}`);
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

          // Quote Info on left
          doc.fillColor(designSettings.textColor)
             .fontSize(designSettings.bodyFontSize)
             .font(designSettings.fontFamily);
          doc.text(`Angebotsnummer: ${quote.quoteNumber}`, marginLeft, infoStartY);
          doc.text(`Angebotsdatum: ${this.formatDate(quote.issueDate)}`);
          doc.text(`Gültig bis: ${this.formatDate(quote.validUntil)}`);
        }

        // Customer Address
        const customerStartY = infoStartY + 120;
        doc.fillColor(designSettings.textColor)
           .fontSize(designSettings.bodyFontSize)
           .font(designSettings.fontFamily);
        doc.text('Angebotsempfänger:', marginLeft, customerStartY);
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

        if (quote.items) {
          for (const item of quote.items) {
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
        doc.text(this.formatCurrency(quote.subtotal), pageWidth - marginRight - 70, totalsY, { width: 70, align: 'right' });

        doc.text(`MwSt.:`, pageWidth - marginRight - 200, totalsY + 20, { width: 130 });
        doc.text(this.formatCurrency(quote.taxAmount), pageWidth - marginRight - 70, totalsY + 20, { width: 70, align: 'right' });

        doc.font(`${designSettings.fontFamily}-Bold`);
        doc.text('Gesamtbetrag (brutto):', pageWidth - marginRight - 200, totalsY + 45, { width: 130 });
        doc.text(this.formatCurrency(quote.total), pageWidth - marginRight - 70, totalsY + 45, { width: 70, align: 'right' });

        // Terms & Conditions and Notes
        let currentY = totalsY + 80;

        if (quote.termsConditions) {
          doc.fillColor(designSettings.textColor)
             .font(`${designSettings.fontFamily}-Bold`)
             .fontSize(designSettings.bodyFontSize - 1);
          doc.text('Bedingungen:', marginLeft, currentY);
          currentY += 15;
          doc.font(designSettings.fontFamily).fontSize(designSettings.bodyFontSize - 1);
          doc.text(quote.termsConditions, marginLeft, currentY, { width: 250 });
          currentY += 30;
        }

        if (quote.notes) {
          doc.fillColor(designSettings.textColor)
             .font(`${designSettings.fontFamily}-Bold`)
             .fontSize(designSettings.bodyFontSize - 1);
          doc.text('Hinweise:', marginLeft, currentY);
          currentY += 15;
          doc.font(designSettings.fontFamily).fontSize(designSettings.bodyFontSize - 1);
          doc.text(quote.notes, marginLeft, currentY, { width: 250 });
        }

        // Validity notice
        doc.fillColor(designSettings.secondaryColor)
           .font(designSettings.fontFamily)
           .fontSize(designSettings.bodyFontSize - 1);
        doc.text(
          `Dieses Angebot ist gültig bis zum ${this.formatDate(quote.validUntil)}.`,
          marginLeft,
          currentY + 40,
          { width: contentWidth }
        );

        // Bank Info
        if (designSettings.showBankInfo && company && (company.bankName || company.iban)) {
          currentY += 70;
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
          }
        }

        // QR Code for EPC/SEPA payment
        if (qrBuffer) {
          try {
            // Position QR code in bottom right corner, above footer
            const qrX = pageWidth - marginRight - 80;
            const qrY = 680;
            doc.image(qrBuffer, qrX, qrY, { width: 70, height: 70 });

            // Add small label
            doc.fontSize(6).fillColor(designSettings.secondaryColor);
            doc.text('Zahlung per QR-Code', qrX, qrY + 72, { width: 70, align: 'center' });
          } catch (qrError) {
            console.error('Error rendering QR code:', qrError);
          }
        }

        // Watermark for quote status
        if (designSettings.showWatermark && quote.status !== 'sent') {
          const watermarkText = this.getWatermarkText(quote.status);
          if (watermarkText) {
            doc.save();

            // Center of page
            const centerX = pageWidth / 2;
            const centerY = 421; // A4 height / 2

            // Rotate and position
            doc.translate(centerX, centerY);
            doc.rotate(-45);

            // Draw watermark text
            doc.fontSize(72)
               .fillColor('#cccccc')
               .opacity(0.3)
               .text(watermarkText, -150, -30, { width: 300, align: 'center' });

            doc.restore();
          }
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

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE');
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  /**
   * Generate EPC QR code data string for SEPA credit transfer
   */
  private generateEpcQrData(company: Company, quote: Quote): string {
    const lines = [
      'BCD',                                          // Service Tag
      '002',                                          // Version
      '1',                                            // Character Set (1 = UTF-8)
      'SCT',                                          // SEPA Credit Transfer
      company.bic || '',                              // BIC (optional)
      company.name.substring(0, 70),                  // Beneficiary Name (max 70 chars)
      company.iban?.replace(/\s/g, '') || '',         // IBAN (no spaces)
      `EUR${quote.total.toFixed(2)}`,                // Amount
      '',                                             // Purpose code (optional)
      quote.quoteNumber.substring(0, 35),            // Reference (max 35 chars)
      `Angebot ${quote.quoteNumber}`,                // Remittance Info
      ''                                              // Beneficiary Info (optional)
    ];

    return lines.join('\n');
  }

  /**
   * Get watermark text based on quote status
   */
  private getWatermarkText(status: string): string | null {
    const statusTexts: Record<string, string> = {
      'draft': 'ENTWURF',
      'accepted': 'ANGENOMMEN',
      'rejected': 'ABGELEHNT',
      'expired': 'ABGELAUFEN',
    };
    return statusTexts[status] || null;
  }
}

export const quotePdfService = new QuotePdfService();
