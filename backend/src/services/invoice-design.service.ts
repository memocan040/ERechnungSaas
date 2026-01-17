import { query } from '../config/database';
import { InvoiceDesignSettings, UpdateInvoiceDesignData, TemplatePreset } from '../types';
import { AppError } from '../middleware/errorHandler';

export class InvoiceDesignService {
  private readonly TEMPLATE_PRESETS: TemplatePreset[] = [
    {
      name: 'modern',
      displayName: 'Modern',
      description: 'Clean and contemporary design with bold colors',
      settings: {
        templateName: 'modern',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        textColor: '#000000',
        backgroundColor: '#ffffff',
        tableHeaderBg: '#eff6ff',
        accentColor: '#0ea5e9',
        logoPosition: 'left',
        logoSize: 'medium',
        fontFamily: 'Helvetica',
        headerFontSize: 24,
        bodyFontSize: 10,
        footerFontSize: 8,
        pageMarginTop: 50,
        pageMarginBottom: 50,
        pageMarginLeft: 50,
        pageMarginRight: 50,
        sectionSpacing: 20,
      }
    },
    {
      name: 'classic',
      displayName: 'Klassisch',
      description: 'Traditional business style with serif fonts',
      settings: {
        templateName: 'classic',
        primaryColor: '#1e3a8a',
        secondaryColor: '#475569',
        textColor: '#000000',
        backgroundColor: '#ffffff',
        tableHeaderBg: '#e0e7ff',
        accentColor: '#3b82f6',
        logoPosition: 'center',
        logoSize: 'large',
        fontFamily: 'Times-Roman',
        headerFontSize: 22,
        bodyFontSize: 11,
        footerFontSize: 9,
        pageMarginTop: 60,
        pageMarginBottom: 60,
        pageMarginLeft: 60,
        pageMarginRight: 60,
        sectionSpacing: 25,
      }
    },
    {
      name: 'minimal',
      displayName: 'Minimalistisch',
      description: 'Simple and elegant with minimal colors',
      settings: {
        templateName: 'minimal',
        primaryColor: '#000000',
        secondaryColor: '#6b7280',
        textColor: '#1f2937',
        backgroundColor: '#ffffff',
        tableHeaderBg: '#f9fafb',
        accentColor: '#374151',
        logoPosition: 'left',
        logoSize: 'small',
        fontFamily: 'Helvetica',
        headerFontSize: 20,
        bodyFontSize: 9,
        footerFontSize: 7,
        pageMarginTop: 40,
        pageMarginBottom: 40,
        pageMarginLeft: 40,
        pageMarginRight: 40,
        sectionSpacing: 15,
      }
    },
    {
      name: 'professional',
      displayName: 'Professionell',
      description: 'Corporate style with structured layout',
      settings: {
        templateName: 'professional',
        primaryColor: '#059669',
        secondaryColor: '#64748b',
        textColor: '#000000',
        backgroundColor: '#ffffff',
        tableHeaderBg: '#d1fae5',
        accentColor: '#10b981',
        logoPosition: 'right',
        logoSize: 'medium',
        fontFamily: 'Helvetica',
        headerFontSize: 22,
        bodyFontSize: 10,
        footerFontSize: 8,
        pageMarginTop: 50,
        pageMarginBottom: 50,
        pageMarginLeft: 55,
        pageMarginRight: 55,
        sectionSpacing: 22,
      }
    },
    {
      name: 'creative',
      displayName: 'Kreativ',
      description: 'Bold and colorful for creative industries',
      settings: {
        templateName: 'creative',
        primaryColor: '#7c3aed',
        secondaryColor: '#8b5cf6',
        textColor: '#1e1b4b',
        backgroundColor: '#ffffff',
        tableHeaderBg: '#ede9fe',
        accentColor: '#a78bfa',
        logoPosition: 'center',
        logoSize: 'large',
        fontFamily: 'Helvetica',
        headerFontSize: 26,
        bodyFontSize: 10,
        footerFontSize: 8,
        pageMarginTop: 45,
        pageMarginBottom: 45,
        pageMarginLeft: 45,
        pageMarginRight: 45,
        sectionSpacing: 18,
      }
    }
  ];

  async findByUserId(userId: string): Promise<InvoiceDesignSettings | null> {
    const result = await query(
      'SELECT * FROM invoice_design_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToDesignSettings(result.rows[0]);
  }

  async createOrUpdate(userId: string, data: UpdateInvoiceDesignData): Promise<InvoiceDesignSettings> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return this.update(userId, data);
    }

    return this.create(userId, data);
  }

  private async create(userId: string, data: UpdateInvoiceDesignData): Promise<InvoiceDesignSettings> {
    const result = await query(
      `INSERT INTO invoice_design_settings (
        user_id, template_name, primary_color, secondary_color, text_color,
        background_color, table_header_bg, accent_color, logo_position, logo_size,
        show_logo, font_family, header_font_size, body_font_size, footer_font_size,
        page_margin_top, page_margin_bottom, page_margin_left, page_margin_right,
        section_spacing, show_company_logo, show_bank_info, show_footer_info,
        show_watermark, show_qr_code, company_info_position, invoice_info_position
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
      RETURNING *`,
      [
        userId,
        data.templateName || 'modern',
        data.primaryColor || '#2563eb',
        data.secondaryColor || '#64748b',
        data.textColor || '#000000',
        data.backgroundColor || '#ffffff',
        data.tableHeaderBg || '#f0f0f0',
        data.accentColor || '#0ea5e9',
        data.logoPosition || 'left',
        data.logoSize || 'medium',
        data.showLogo !== undefined ? data.showLogo : true,
        data.fontFamily || 'Helvetica',
        data.headerFontSize || 24,
        data.bodyFontSize || 10,
        data.footerFontSize || 8,
        data.pageMarginTop || 50,
        data.pageMarginBottom || 50,
        data.pageMarginLeft || 50,
        data.pageMarginRight || 50,
        data.sectionSpacing || 20,
        data.showCompanyLogo !== undefined ? data.showCompanyLogo : true,
        data.showBankInfo !== undefined ? data.showBankInfo : true,
        data.showFooterInfo !== undefined ? data.showFooterInfo : true,
        data.showWatermark !== undefined ? data.showWatermark : false,
        data.showQrCode !== undefined ? data.showQrCode : true,
        data.companyInfoPosition || 'left',
        data.invoiceInfoPosition || 'right',
      ]
    );

    return this.mapToDesignSettings(result.rows[0]);
  }

  private async update(userId: string, data: UpdateInvoiceDesignData): Promise<InvoiceDesignSettings> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields = {
      templateName: 'template_name',
      primaryColor: 'primary_color',
      secondaryColor: 'secondary_color',
      textColor: 'text_color',
      backgroundColor: 'background_color',
      tableHeaderBg: 'table_header_bg',
      accentColor: 'accent_color',
      logoPosition: 'logo_position',
      logoSize: 'logo_size',
      showLogo: 'show_logo',
      fontFamily: 'font_family',
      headerFontSize: 'header_font_size',
      bodyFontSize: 'body_font_size',
      footerFontSize: 'footer_font_size',
      pageMarginTop: 'page_margin_top',
      pageMarginBottom: 'page_margin_bottom',
      pageMarginLeft: 'page_margin_left',
      pageMarginRight: 'page_margin_right',
      sectionSpacing: 'section_spacing',
      showCompanyLogo: 'show_company_logo',
      showBankInfo: 'show_bank_info',
      showFooterInfo: 'show_footer_info',
      showWatermark: 'show_watermark',
      showQrCode: 'show_qr_code',
      companyInfoPosition: 'company_info_position',
      invoiceInfoPosition: 'invoice_info_position',
    };

    for (const [jsField, dbField] of Object.entries(updateableFields)) {
      if (data[jsField as keyof UpdateInvoiceDesignData] !== undefined) {
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(data[jsField as keyof UpdateInvoiceDesignData]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      const existing = await this.findByUserId(userId);
      if (!existing) {
        throw new AppError('Design settings not found', 404);
      }
      return existing;
    }

    values.push(userId);
    const result = await query(
      `UPDATE invoice_design_settings SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Design settings not found', 404);
    }

    return this.mapToDesignSettings(result.rows[0]);
  }

  async applyTemplate(userId: string, templateName: string): Promise<InvoiceDesignSettings> {
    const template = this.TEMPLATE_PRESETS.find(t => t.name === templateName);

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    return this.createOrUpdate(userId, template.settings as UpdateInvoiceDesignData);
  }

  getTemplatePresets(): TemplatePreset[] {
    return this.TEMPLATE_PRESETS;
  }

  private mapToDesignSettings(row: Record<string, unknown>): InvoiceDesignSettings {
    const settings = {
      id: row.id as string,
      userId: row.user_id as string,
      templateName: (row.template_name as any) || 'modern',
      primaryColor: (row.primary_color as string) || '#2563eb',
      secondaryColor: (row.secondary_color as string) || '#64748b',
      textColor: (row.text_color as string) || '#000000',
      backgroundColor: (row.background_color as string) || '#ffffff',
      tableHeaderBg: (row.table_header_bg as string) || '#eff6ff',
      accentColor: (row.accent_color as string) || '#0ea5e9',
      logoPosition: (row.logo_position as any) || 'left',
      logoSize: (row.logo_size as any) || 'medium',
      showLogo: row.show_logo !== null && row.show_logo !== undefined ? row.show_logo as boolean : true,
      fontFamily: (row.font_family as any) || 'Helvetica',
      headerFontSize: (row.header_font_size as number) || 24,
      bodyFontSize: (row.body_font_size as number) || 10,
      footerFontSize: (row.footer_font_size as number) || 8,
      pageMarginTop: (row.page_margin_top as number) || 50,
      pageMarginBottom: (row.page_margin_bottom as number) || 50,
      pageMarginLeft: (row.page_margin_left as number) || 50,
      pageMarginRight: (row.page_margin_right as number) || 50,
      sectionSpacing: (row.section_spacing as number) || 20,
      showCompanyLogo: row.show_company_logo !== null && row.show_company_logo !== undefined ? row.show_company_logo as boolean : true,
      showBankInfo: row.show_bank_info !== null && row.show_bank_info !== undefined ? row.show_bank_info as boolean : true,
      showFooterInfo: row.show_footer_info !== null && row.show_footer_info !== undefined ? row.show_footer_info as boolean : true,
      showWatermark: row.show_watermark !== null && row.show_watermark !== undefined ? row.show_watermark as boolean : false,
      showQrCode: row.show_qr_code !== null && row.show_qr_code !== undefined ? row.show_qr_code as boolean : true,
      companyInfoPosition: (row.company_info_position as any) || 'left',
      invoiceInfoPosition: (row.invoice_info_position as any) || 'right',
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };

    console.log('[InvoiceDesignService] Loaded settings:', JSON.stringify(settings, null, 2));
    return settings;
  }
}

export const invoiceDesignService = new InvoiceDesignService();
