import { query } from '../config/database';
import { UserSettings } from '../types';
import { AppError } from '../middleware/errorHandler';

export class SettingsService {
  async findByUserId(userId: string): Promise<UserSettings | null> {
    const result = await query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToSettings(result.rows[0]);
  }

  async createOrUpdate(userId: string, data: Partial<UserSettings>): Promise<UserSettings> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return this.update(userId, data);
    }

    return this.create(userId, data);
  }

  private async create(userId: string, data: Partial<UserSettings>): Promise<UserSettings> {
    const result = await query(
      `INSERT INTO user_settings (
        user_id, default_tax_rate, default_payment_days, invoice_prefix,
        currency, language, email_notifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        userId,
        data.defaultTaxRate ?? 19,
        data.defaultPaymentDays ?? 14,
        data.invoicePrefix ?? 'RE-',
        data.currency ?? 'EUR',
        data.language ?? 'de',
        data.emailNotifications ?? true,
      ]
    );

    return this.mapToSettings(result.rows[0]);
  }

  private async update(userId: string, data: Partial<UserSettings>): Promise<UserSettings> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'defaultTaxRate',
      'defaultPaymentDays',
      'invoicePrefix',
      'currency',
      'language',
      'emailNotifications',
    ];

    const fieldMapping: Record<string, string> = {
      defaultTaxRate: 'default_tax_rate',
      defaultPaymentDays: 'default_payment_days',
      invoicePrefix: 'invoice_prefix',
      emailNotifications: 'email_notifications',
    };

    for (const field of updateableFields) {
      if (data[field as keyof UserSettings] !== undefined) {
        const dbField = fieldMapping[field] || field;
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(data[field as keyof UserSettings]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      const existing = await this.findByUserId(userId);
      if (!existing) {
        throw new AppError('Settings not found', 404);
      }
      return existing;
    }

    values.push(userId);
    const result = await query(
      `UPDATE user_settings SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Settings not found', 404);
    }

    return this.mapToSettings(result.rows[0]);
  }

  async getNextInvoiceNumber(userId: string): Promise<string> {
    const settings = await this.findByUserId(userId);

    if (!settings) {
      return 'RE-00001';
    }

    return `${settings.invoicePrefix}${String(settings.nextInvoiceNumber).padStart(5, '0')}`;
  }

  private mapToSettings(row: Record<string, unknown>): UserSettings {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      defaultTaxRate: parseFloat(row.default_tax_rate as string),
      defaultPaymentDays: row.default_payment_days as number,
      invoicePrefix: row.invoice_prefix as string,
      nextInvoiceNumber: row.next_invoice_number as number,
      currency: row.currency as string,
      language: row.language as string,
      emailNotifications: row.email_notifications as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export const settingsService = new SettingsService();
