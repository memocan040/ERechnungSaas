-- ERechnung Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies table (business details for invoices)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Deutschland',
    vat_id VARCHAR(50),
    tax_number VARCHAR(50),
    trade_register VARCHAR(100),
    court VARCHAR(100),
    managing_director VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    bank_name VARCHAR(255),
    iban VARCHAR(50),
    bic VARCHAR(20),
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Deutschland',
    vat_id VARCHAR(50),
    customer_number VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    notes TEXT,
    payment_terms TEXT,
    pdf_url VARCHAR(500),
    xml_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, invoice_number)
);

-- Invoice items table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'Stück',
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    default_payment_days INTEGER DEFAULT 14,
    invoice_prefix VARCHAR(20) DEFAULT 'RE-',
    next_invoice_number INTEGER DEFAULT 1,
    currency VARCHAR(3) DEFAULT 'EUR',
    language VARCHAR(10) DEFAULT 'de',
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoice design settings table
CREATE TABLE invoice_design_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Template
    template_name VARCHAR(50) NOT NULL DEFAULT 'modern' CHECK (template_name IN ('modern', 'classic', 'minimal', 'professional', 'creative')),

    -- Farben (Hex-Codes)
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    text_color VARCHAR(7) DEFAULT '#000000',
    background_color VARCHAR(7) DEFAULT '#ffffff',
    table_header_bg VARCHAR(7) DEFAULT '#f0f0f0',
    accent_color VARCHAR(7) DEFAULT '#0ea5e9',

    -- Logo-Einstellungen
    logo_position VARCHAR(20) DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
    logo_size VARCHAR(20) DEFAULT 'medium' CHECK (logo_size IN ('small', 'medium', 'large')),
    show_logo BOOLEAN DEFAULT true,

    -- Schrift-Einstellungen
    font_family VARCHAR(50) DEFAULT 'Helvetica' CHECK (font_family IN ('Helvetica', 'Times-Roman', 'Courier')),
    header_font_size INTEGER DEFAULT 24 CHECK (header_font_size BETWEEN 16 AND 36),
    body_font_size INTEGER DEFAULT 10 CHECK (body_font_size BETWEEN 8 AND 14),
    footer_font_size INTEGER DEFAULT 8 CHECK (footer_font_size BETWEEN 6 AND 12),

    -- Layout (in Points)
    page_margin_top INTEGER DEFAULT 50 CHECK (page_margin_top BETWEEN 20 AND 100),
    page_margin_bottom INTEGER DEFAULT 50 CHECK (page_margin_bottom BETWEEN 20 AND 100),
    page_margin_left INTEGER DEFAULT 50 CHECK (page_margin_left BETWEEN 20 AND 100),
    page_margin_right INTEGER DEFAULT 50 CHECK (page_margin_right BETWEEN 20 AND 100),
    section_spacing INTEGER DEFAULT 20 CHECK (section_spacing BETWEEN 10 AND 50),

    -- Sichtbarkeits-Toggles
    show_company_logo BOOLEAN DEFAULT true,
    show_bank_info BOOLEAN DEFAULT true,
    show_footer_info BOOLEAN DEFAULT true,
    company_info_position VARCHAR(20) DEFAULT 'left' CHECK (company_info_position IN ('left', 'right')),
    invoice_info_position VARCHAR(20) DEFAULT 'right' CHECK (invoice_info_position IN ('left', 'right')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for refresh tokens
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACCOUNTING MODULE TABLES (Phase 1)
-- ============================================

-- Cost Centers (Kostenstellen) - needed before chart_of_accounts
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, code)
);

-- Chart of Accounts (Kontenplan) - SKR03/SKR04
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(10) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'asset',           -- Aktiva/Vermögen
        'liability',       -- Passiva/Schulden
        'equity',          -- Eigenkapital
        'revenue',         -- Erträge/Erlöse
        'expense',         -- Aufwendungen/Kosten
        'contra_asset',    -- Gegenkonten Aktiva
        'contra_liability' -- Gegenkonten Passiva
    )),
    account_class VARCHAR(50) NOT NULL CHECK (account_class IN (
        'current_asset',      -- Umlaufvermögen
        'fixed_asset',        -- Anlagevermögen
        'current_liability',  -- Kurzfristige Verbindlichkeiten
        'long_term_liability',-- Langfristige Verbindlichkeiten
        'equity',             -- Eigenkapital
        'operating_revenue',  -- Betriebliche Erträge
        'other_revenue',      -- Sonstige Erträge
        'operating_expense',  -- Betriebliche Aufwendungen
        'other_expense'       -- Sonstige Aufwendungen
    )),
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    tax_relevant BOOLEAN DEFAULT false,
    tax_code VARCHAR(10),
    auto_vat_account_id UUID REFERENCES chart_of_accounts(id),
    is_system_account BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    datev_account_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, account_number)
);

-- SKR03 Standard Accounts (Seed Data)
CREATE TABLE skr03_standard_accounts (
    account_number VARCHAR(10) PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_class VARCHAR(50) NOT NULL,
    tax_code VARCHAR(10),
    description TEXT
);

-- Journal Entries (Buchungssätze)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL CHECK (fiscal_period BETWEEN 1 AND 12),
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'manual',          -- Manual entry
        'invoice',         -- From invoice creation
        'payment',         -- From payment receipt
        'expense',         -- From expense
        'opening_balance', -- Opening balance
        'closing',         -- Year-end closing
        'adjustment',      -- Adjustments
        'reversal'         -- Stornobuchung
    )),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT NOT NULL,
    notes TEXT,
    reversed_by UUID REFERENCES journal_entries(id),
    reverses UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES users(id),
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, entry_number)
);

-- Journal Entry Lines (Buchungszeilen)
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    debit_amount DECIMAL(12, 2) DEFAULT 0.00,
    credit_amount DECIMAL(12, 2) DEFAULT 0.00,
    description TEXT,
    cost_center_id UUID REFERENCES cost_centers(id),
    tax_code VARCHAR(10),
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (debit_amount = 0 AND credit_amount > 0)
    )
);

-- Accounting Settings
CREATE TABLE accounting_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chart_of_accounts_type VARCHAR(10) DEFAULT 'SKR03' CHECK (chart_of_accounts_type IN ('SKR03', 'SKR04')),
    fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    use_cost_centers BOOLEAN DEFAULT false,
    datev_consultant_number INTEGER,
    datev_client_number INTEGER,
    default_bank_account_id UUID REFERENCES chart_of_accounts(id),
    default_cash_account_id UUID REFERENCES chart_of_accounts(id),
    default_accounts_receivable_id UUID REFERENCES chart_of_accounts(id),
    default_accounts_payable_id UUID REFERENCES chart_of_accounts(id),
    default_revenue_account_id UUID REFERENCES chart_of_accounts(id),
    default_vat_payable_account_id UUID REFERENCES chart_of_accounts(id),
    default_vat_receivable_account_id UUID REFERENCES chart_of_accounts(id),
    next_journal_entry_number INTEGER DEFAULT 1,
    next_expense_number INTEGER DEFAULT 1,
    next_payment_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXPENSE MANAGEMENT TABLES (Phase 2)
-- ============================================

-- Vendors (Suppliers)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_number VARCHAR(50) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Deutschland',
    vat_id VARCHAR(50),
    tax_number VARCHAR(50),
    iban VARCHAR(50),
    bic VARCHAR(20),
    payment_terms VARCHAR(255),
    default_payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, vendor_number)
);

-- Expense Categories
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_account_id UUID REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
    expense_number VARCHAR(50) NOT NULL,
    vendor_invoice_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'approved', 'paid', 'rejected', 'cancelled'
    )),
    expense_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    category_id UUID REFERENCES expense_categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    description TEXT NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50) CHECK (payment_method IN (
        'bank_transfer', 'cash', 'credit_card', 'debit_card', 'paypal', 'other'
    )),
    receipt_url VARCHAR(500),
    notes TEXT,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, expense_number)
);

-- Expense Items
CREATE TABLE expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    account_id UUID REFERENCES chart_of_accounts(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert SKR03 Standard Accounts (German Standard Chart of Accounts)
INSERT INTO skr03_standard_accounts (account_number, account_name, account_type, account_class, tax_code, description) VALUES
-- Assets (Aktiva)
('1000', 'Kasse', 'asset', 'current_asset', NULL, 'Cash on hand'),
('1200', 'Bank', 'asset', 'current_asset', NULL, 'Bank account'),
('1400', 'Forderungen aus Lieferungen und Leistungen', 'asset', 'current_asset', NULL, 'Accounts Receivable'),
('1576', 'Abziehbare Vorsteuer 19%', 'asset', 'current_asset', 'VSt19', 'Input VAT 19%'),
('1571', 'Abziehbare Vorsteuer 7%', 'asset', 'current_asset', 'VSt7', 'Input VAT 7%'),

-- Liabilities (Passiva)
('1600', 'Verbindlichkeiten aus Lieferungen und Leistungen', 'liability', 'current_liability', NULL, 'Accounts Payable'),
('1776', 'Umsatzsteuer 19%', 'liability', 'current_liability', 'USt19', 'Output VAT 19%'),
('1771', 'Umsatzsteuer 7%', 'liability', 'current_liability', 'USt7', 'Output VAT 7%'),
('1780', 'Umsatzsteuer-Vorauszahlungen', 'liability', 'current_liability', NULL, 'VAT advance payments'),

-- Equity (Eigenkapital)
('2000', 'Eigenkapital', 'equity', 'equity', NULL, 'Owner''s Equity'),
('2100', 'Gewinnvortrag vor Verwendung', 'equity', 'equity', NULL, 'Retained Earnings'),

-- Expenses (Aufwendungen)
('4210', 'Miete', 'expense', 'operating_expense', NULL, 'Rent'),
('4240', 'Gas, Strom, Wasser', 'expense', 'operating_expense', NULL, 'Utilities'),
('4610', 'Versicherungen', 'expense', 'operating_expense', NULL, 'Insurance'),
('4650', 'Bürobedarf', 'expense', 'operating_expense', NULL, 'Office supplies'),
('4830', 'Verschiedene Bürokosten', 'expense', 'operating_expense', NULL, 'Miscellaneous office costs'),
('4920', 'Telefon', 'expense', 'operating_expense', NULL, 'Telephone'),
('4930', 'Porto', 'expense', 'operating_expense', NULL, 'Postage'),
('4940', 'Buchführungskosten', 'expense', 'operating_expense', NULL, 'Accounting costs'),
('4980', 'Sonstige Kosten', 'expense', 'operating_expense', NULL, 'Other costs'),
('6000', 'Löhne und Gehälter', 'expense', 'operating_expense', NULL, 'Wages and salaries'),
('6300', 'Soziale Abgaben', 'expense', 'operating_expense', NULL, 'Social security contributions'),

-- Revenue (Erträge)
('8100', 'Erlöse steuerfrei', 'revenue', 'operating_revenue', NULL, 'Tax-free revenue'),
('8300', 'Erlöse 7% USt', 'revenue', 'operating_revenue', 'USt7', 'Revenue subject to 7% VAT'),
('8400', 'Erlöse 19% USt', 'revenue', 'operating_revenue', 'USt19', 'Revenue subject to 19% VAT'),
('8500', 'Erlöse aus Anlagenverkauf', 'revenue', 'other_revenue', NULL, 'Revenue from asset sales');

-- Indexes for better query performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);

-- Accounting module indexes
CREATE INDEX idx_cost_centers_user_id ON cost_centers(user_id);
CREATE INDEX idx_coa_user_id ON chart_of_accounts(user_id);
CREATE INDEX idx_coa_account_number ON chart_of_accounts(user_id, account_number);
CREATE INDEX idx_coa_parent_account ON chart_of_accounts(parent_account_id);
CREATE INDEX idx_je_user_id ON journal_entries(user_id);
CREATE INDEX idx_je_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_je_fiscal_period ON journal_entries(fiscal_year, fiscal_period);
CREATE INDEX idx_je_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_jel_journal_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);

-- Expense module indexes
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expense_items_expense ON expense_items(expense_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Accounting module triggers
CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounting_settings_updated_at BEFORE UPDATE ON accounting_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Expense module triggers
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- QUOTES MODULE TABLES
-- ============================================

-- Quotes table (Angebote)
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    quote_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    issue_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    converted_date DATE,
    converted_invoice_id UUID REFERENCES invoices(id),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    notes TEXT,
    terms_conditions TEXT,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quote_number)
);

-- Quote items table
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'Stück',
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotes indexes
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_issue_date ON quotes(issue_date);
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);

-- Quotes trigger
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add quote settings to user_settings (run as ALTER for existing databases)
-- For new installations, these columns should be added to the user_settings CREATE TABLE
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS quote_prefix VARCHAR(20) DEFAULT 'AN-';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS next_quote_number INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_quote_validity_days INTEGER DEFAULT 30;
