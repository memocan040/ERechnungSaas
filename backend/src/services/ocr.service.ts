import { createWorker, Worker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import { OcrResult, OcrExtractedData } from '../types';

class OcrService {
  private worker: Worker | null = null;

  /**
   * Initialize Tesseract worker
   */
  private async getWorker(): Promise<Worker> {
    if (!this.worker) {
      this.worker = await createWorker('deu+eng');
    }
    return this.worker;
  }

  /**
   * Terminate worker when done
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Process a file and extract text using OCR
   */
  async processFile(filePath: string, fileType: string): Promise<OcrResult> {
    let rawText = '';
    let confidence = 0;

    try {
      if (fileType === 'application/pdf') {
        // For PDFs, first try text extraction, then fall back to OCR
        rawText = await this.extractTextFromPdf(filePath);
        confidence = rawText.length > 100 ? 95 : 50; // Native PDF text has high confidence

        // If no text extracted, the PDF might be image-based
        if (rawText.length < 50) {
          const ocrResult = await this.ocrPdfFirstPage(filePath);
          rawText = ocrResult.text;
          confidence = ocrResult.confidence;
        }
      } else if (fileType.startsWith('image/')) {
        // Direct OCR for images
        const result = await this.extractTextFromImage(filePath);
        rawText = result.text;
        confidence = result.confidence;
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Parse the extracted text to find invoice data
      const extractedData = this.parseInvoiceData(rawText);

      return {
        rawText,
        confidence,
        extractedData,
        processedAt: new Date(),
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
    }
  }

  /**
   * Extract text from an image using Tesseract
   */
  async extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
    const worker = await this.getWorker();

    const { data } = await worker.recognize(imagePath);

    return {
      text: data.text,
      confidence: data.confidence,
    };
  }

  /**
   * Extract text from a PDF using pdf-parse
   */
  async extractTextFromPdf(pdfPath: string): Promise<string> {
    try {
      // Dynamic import for pdf-parse
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF text extraction error:', error);
      return '';
    }
  }

  /**
   * OCR the first page of a PDF (for image-based PDFs)
   */
  async ocrPdfFirstPage(pdfPath: string): Promise<{ text: string; confidence: number }> {
    // For now, we'll just return an error message since converting PDF pages
    // to images requires additional dependencies (like pdf2pic or pdfjs-dist with canvas)
    // This can be expanded later with sharp or pdf2pic
    console.warn('Image-based PDF OCR not fully implemented. Please use image files for best results.');
    return {
      text: '',
      confidence: 0,
    };
  }

  /**
   * Parse extracted text to find invoice data using German patterns
   */
  parseInvoiceData(text: string): OcrExtractedData {
    const extractedData: OcrExtractedData = {};

    // Normalize text for better matching
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    // Invoice number patterns (German)
    const invoiceNumberPatterns = [
      /Rechnungsnummer[:\s]*([A-Z0-9\-\/]+)/i,
      /Rechnung\s*Nr\.?[:\s]*([A-Z0-9\-\/]+)/i,
      /RE[\-\s]?Nr\.?[:\s]*([A-Z0-9\-\/]+)/i,
      /Invoice\s*No\.?[:\s]*([A-Z0-9\-\/]+)/i,
      /Beleg[\-\s]?Nr\.?[:\s]*([A-Z0-9\-\/]+)/i,
      /Nr\.?\s*[:]\s*([A-Z0-9\-\/]+)/i,
    ];

    for (const pattern of invoiceNumberPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        extractedData.invoiceNumber = match[1].trim();
        break;
      }
    }

    // Date patterns (German DD.MM.YYYY format)
    const datePattern = /(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/g;
    const dates: string[] = [];
    let dateMatch;

    while ((dateMatch = datePattern.exec(normalizedText)) !== null) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      dates.push(`${year}-${month}-${day}`);
    }

    // Invoice date patterns
    const invoiceDatePatterns = [
      /Rechnungsdatum[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
      /Datum[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
      /Ausstellungsdatum[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
      /Date[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
    ];

    for (const pattern of invoiceDatePatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        let year = match[3];
        if (year.length === 2) {
          year = '20' + year;
        }
        extractedData.invoiceDate = `${year}-${month}-${day}`;
        break;
      }
    }

    // If no specific invoice date found, use first date
    if (!extractedData.invoiceDate && dates.length > 0) {
      extractedData.invoiceDate = dates[0];
    }

    // Due date patterns
    const dueDatePatterns = [
      /Fällig(?:keit)?(?:sdatum)?[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
      /Zahlungsziel[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
      /Due\s*Date[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
      /Zahlbar\s*bis[:\s]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/i,
    ];

    for (const pattern of dueDatePatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        let year = match[3];
        if (year.length === 2) {
          year = '20' + year;
        }
        extractedData.dueDate = `${year}-${month}-${day}`;
        break;
      }
    }

    // VAT ID (German format: DE + 9 digits)
    const vatIdPatterns = [
      /USt[\.\-]?(?:Id)?(?:Nr)?\.?[:\s]*(DE\s?\d{9})/i,
      /Umsatzsteuer[\-\s]?(?:Identifikations)?[\-\s]?Nr\.?[:\s]*(DE\s?\d{9})/i,
      /VAT[\-\s]?(?:ID)?[:\s]*(DE\s?\d{9})/i,
      /(DE\s?\d{9})/i,
    ];

    for (const pattern of vatIdPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        extractedData.vendorVatId = match[1].replace(/\s/g, '');
        break;
      }
    }

    // Tax number (German Steuernummer)
    const taxNumberPatterns = [
      /Steuernummer[:\s]*(\d{2,3}[\s\/]?\d{3,4}[\s\/]?\d{4,5})/i,
      /St[\.\-]?Nr\.?[:\s]*(\d{2,3}[\s\/]?\d{3,4}[\s\/]?\d{4,5})/i,
    ];

    for (const pattern of taxNumberPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        extractedData.vendorTaxNumber = match[1].trim();
        break;
      }
    }

    // IBAN
    const ibanPattern = /([A-Z]{2}\d{2}\s?(?:\d{4}\s?){4,7}\d{0,2})/gi;
    const ibanMatch = normalizedText.match(ibanPattern);
    if (ibanMatch && ibanMatch[0]) {
      extractedData.vendorIban = ibanMatch[0].replace(/\s/g, '');
    }

    // BIC/SWIFT
    const bicPatterns = [
      /BIC[:\s]*([A-Z]{6}[A-Z0-9]{2,5})/i,
      /SWIFT[:\s]*([A-Z]{6}[A-Z0-9]{2,5})/i,
      /([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/,
    ];

    for (const pattern of bicPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1] && match[1].length >= 8 && match[1].length <= 11) {
        // Validate it looks like a BIC
        if (/^[A-Z]{6}[A-Z0-9]{2,5}$/i.test(match[1])) {
          extractedData.vendorBic = match[1].toUpperCase();
          break;
        }
      }
    }

    // Amount patterns (German format: 1.234,56 €)
    const amountPatterns = {
      total: [
        /Gesamtbetrag[:\s]*([0-9.,]+)\s*€?/i,
        /Bruttobetrag[:\s]*([0-9.,]+)\s*€?/i,
        /Endbetrag[:\s]*([0-9.,]+)\s*€?/i,
        /Summe[:\s]*([0-9.,]+)\s*€?/i,
        /Total[:\s]*([0-9.,]+)\s*€?/i,
        /Rechnungsbetrag[:\s]*([0-9.,]+)\s*€?/i,
        /zu\s*zahlen[:\s]*([0-9.,]+)\s*€?/i,
      ],
      subtotal: [
        /Nettobetrag[:\s]*([0-9.,]+)\s*€?/i,
        /Zwischensumme[:\s]*([0-9.,]+)\s*€?/i,
        /Summe\s*netto[:\s]*([0-9.,]+)\s*€?/i,
        /Subtotal[:\s]*([0-9.,]+)\s*€?/i,
      ],
      tax: [
        /(?:MwSt|USt|Mehrwertsteuer|Umsatzsteuer)[:\s]*(?:\d+\s*%\s*)?([0-9.,]+)\s*€?/i,
        /(?:\d+\s*%\s*)?(?:MwSt|USt)[:\s]*([0-9.,]+)\s*€?/i,
        /Steuerbetrag[:\s]*([0-9.,]+)\s*€?/i,
      ],
    };

    // Parse German number format (1.234,56 -> 1234.56)
    const parseGermanNumber = (str: string): number => {
      // Remove thousand separators (.) and convert decimal comma to dot
      const cleaned = str.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    };

    for (const pattern of amountPatterns.total) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        extractedData.total = parseGermanNumber(match[1]);
        break;
      }
    }

    for (const pattern of amountPatterns.subtotal) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        extractedData.subtotal = parseGermanNumber(match[1]);
        break;
      }
    }

    for (const pattern of amountPatterns.tax) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        extractedData.taxAmount = parseGermanNumber(match[1]);
        break;
      }
    }

    // Tax rate
    const taxRatePatterns = [
      /(?:MwSt|USt|Mehrwertsteuer|Umsatzsteuer)\s*(\d+(?:[.,]\d+)?)\s*%/i,
      /(\d+(?:[.,]\d+)?)\s*%\s*(?:MwSt|USt|Mehrwertsteuer|Umsatzsteuer)/i,
    ];

    for (const pattern of taxRatePatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        extractedData.taxRate = parseGermanNumber(match[1]);
        break;
      }
    }

    // If we have total and tax, calculate subtotal
    if (extractedData.total && extractedData.taxAmount && !extractedData.subtotal) {
      extractedData.subtotal = extractedData.total - extractedData.taxAmount;
    }

    // If we have total and subtotal, calculate tax
    if (extractedData.total && extractedData.subtotal && !extractedData.taxAmount) {
      extractedData.taxAmount = extractedData.total - extractedData.subtotal;
    }

    // Payment reference / Verwendungszweck
    const referencePatterns = [
      /Verwendungszweck[:\s]*(.+?)(?:\n|$)/i,
      /Betreff[:\s]*(.+?)(?:\n|$)/i,
      /Zahlungsreferenz[:\s]*(.+?)(?:\n|$)/i,
    ];

    for (const pattern of referencePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedData.paymentReference = match[1].trim();
        break;
      }
    }

    // Currency detection
    if (normalizedText.includes('€') || normalizedText.toLowerCase().includes('eur')) {
      extractedData.currency = 'EUR';
    } else if (normalizedText.includes('CHF')) {
      extractedData.currency = 'CHF';
    } else if (normalizedText.includes('$') || normalizedText.toLowerCase().includes('usd')) {
      extractedData.currency = 'USD';
    } else {
      extractedData.currency = 'EUR'; // Default to EUR for German invoices
    }

    // Try to extract vendor name (usually at the top of the invoice)
    // Look for company indicators in the first few lines
    const firstLines = lines.slice(0, 10);
    for (const line of firstLines) {
      // Skip if line looks like an address, date, or number
      if (line.match(/^\d/) || line.match(/[A-Z]{2}\d{2}/) || line.length < 5) {
        continue;
      }
      // Check for common company suffixes
      if (
        line.match(/GmbH|AG|KG|e\.K\.|GbR|OHG|UG|SE|Ltd|Inc|Corp/i) ||
        (line.length > 10 && line.length < 100 && !line.match(/^\d/))
      ) {
        extractedData.vendorName = line.trim();
        break;
      }
    }

    // Try to extract vendor address
    const addressLines: string[] = [];
    let foundAddress = false;

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      // Look for postal code patterns in consecutive lines
      if (line.match(/\d{5}\s+\w+/) || lines[i + 1]?.match(/\d{5}\s+\w+/)) {
        // Found potential address area
        const startIdx = Math.max(0, i - 2);
        for (let j = startIdx; j <= i + 1 && j < lines.length; j++) {
          if (lines[j].length > 3 && lines[j].length < 100) {
            addressLines.push(lines[j]);
          }
        }
        foundAddress = true;
        break;
      }
    }

    if (foundAddress && addressLines.length > 0) {
      extractedData.vendorAddress = addressLines.join(', ');
    }

    return extractedData;
  }
}

export default new OcrService();
