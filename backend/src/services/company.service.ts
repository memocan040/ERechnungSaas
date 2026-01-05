import { query } from '../config/database';
import { Company } from '../types';
import { AppError } from '../middleware/errorHandler';

export class CompanyService {
  async findByUserId(userId: string): Promise<Company | null> {
    const result = await query(
      'SELECT * FROM companies WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToCompany(result.rows[0]);
  }

  async createOrUpdate(userId: string, data: Partial<Company>): Promise<Company> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return this.update(userId, data);
    }

    return this.create(userId, data);
  }

  private async create(userId: string, data: Partial<Company>): Promise<Company> {
    const result = await query(
      `INSERT INTO companies (
        user_id, name, legal_name, street, house_number, postal_code,
        city, country, vat_id, tax_number, trade_register, court,
        managing_director, phone, email, website, bank_name, iban, bic
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        userId,
        data.name || 'Mein Unternehmen',
        data.legalName || null,
        data.street || null,
        data.houseNumber || null,
        data.postalCode || null,
        data.city || null,
        data.country || 'Deutschland',
        data.vatId || null,
        data.taxNumber || null,
        data.tradeRegister || null,
        data.court || null,
        data.managingDirector || null,
        data.phone || null,
        data.email || null,
        data.website || null,
        data.bankName || null,
        data.iban || null,
        data.bic || null,
      ]
    );

    return this.mapToCompany(result.rows[0]);
  }

  private async update(userId: string, data: Partial<Company>): Promise<Company> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'name', 'legalName', 'street', 'houseNumber', 'postalCode',
      'city', 'country', 'vatId', 'taxNumber', 'tradeRegister',
      'court', 'managingDirector', 'phone', 'email', 'website',
      'bankName', 'iban', 'bic', 'logoUrl'
    ];

    const fieldMapping: Record<string, string> = {
      legalName: 'legal_name',
      houseNumber: 'house_number',
      postalCode: 'postal_code',
      vatId: 'vat_id',
      taxNumber: 'tax_number',
      tradeRegister: 'trade_register',
      managingDirector: 'managing_director',
      bankName: 'bank_name',
      logoUrl: 'logo_url',
    };

    for (const field of updateableFields) {
      if (data[field as keyof Company] !== undefined) {
        const dbField = fieldMapping[field] || field;
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(data[field as keyof Company]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      const existing = await this.findByUserId(userId);
      if (!existing) {
        throw new AppError('Company not found', 404);
      }
      return existing;
    }

    values.push(userId);
    const result = await query(
      `UPDATE companies SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Company not found', 404);
    }

    return this.mapToCompany(result.rows[0]);
  }

  async updateLogo(userId: string, logoUrl: string): Promise<Company> {
    const result = await query(
      'UPDATE companies SET logo_url = $1 WHERE user_id = $2 RETURNING *',
      [logoUrl, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Company not found', 404);
    }

    return this.mapToCompany(result.rows[0]);
  }

  private mapToCompany(row: Record<string, unknown>): Company {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      legalName: row.legal_name as string | undefined,
      street: row.street as string | undefined,
      houseNumber: row.house_number as string | undefined,
      postalCode: row.postal_code as string | undefined,
      city: row.city as string | undefined,
      country: row.country as string,
      vatId: row.vat_id as string | undefined,
      taxNumber: row.tax_number as string | undefined,
      tradeRegister: row.trade_register as string | undefined,
      court: row.court as string | undefined,
      managingDirector: row.managing_director as string | undefined,
      phone: row.phone as string | undefined,
      email: row.email as string | undefined,
      website: row.website as string | undefined,
      bankName: row.bank_name as string | undefined,
      iban: row.iban as string | undefined,
      bic: row.bic as string | undefined,
      logoUrl: row.logo_url as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export const companyService = new CompanyService();
