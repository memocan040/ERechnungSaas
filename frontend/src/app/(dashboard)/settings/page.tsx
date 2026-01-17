'use client';

import { useState, useEffect } from 'react';
import { Save, User, FileText, Bell, Lock, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserSettings, User as UserType } from '@/types';
import { settingsApi, authApi, invoiceDesignApi } from '@/lib/api';
import { InvoiceDesignSettings, InvoiceTemplate } from '@/lib/api/invoice-design';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [designSettings, setDesignSettings] = useState<InvoiceDesignSettings | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  
  const [formData, setFormData] = useState({
    defaultTaxRate: 19,
    defaultPaymentDays: 14,
    invoicePrefix: 'RE-',
    currency: 'EUR',
    language: 'de',
    emailNotifications: true,
  });
  
  const [designFormData, setDesignFormData] = useState({
    template: 'modern',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    fontFamily: 'Inter',
    showLogo: true,
    showWatermark: false,
    showFooter: true,
    showQrCode: true,
    margin: 'standard',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, settingsRes, designRes, templatesRes] = await Promise.all([
        authApi.getCurrentUser(),
        settingsApi.get(),
        invoiceDesignApi.get(),
        invoiceDesignApi.getTemplates(),
      ]);

      if (userRes.success && userRes.data) {
        setUser(userRes.data);
      }

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
        setFormData({
          defaultTaxRate: settingsRes.data.defaultTaxRate,
          defaultPaymentDays: settingsRes.data.defaultPaymentDays,
          invoicePrefix: settingsRes.data.invoicePrefix,
          currency: settingsRes.data.currency,
          language: settingsRes.data.language,
          emailNotifications: settingsRes.data.emailNotifications,
        });
      }

      if (designRes.success && designRes.data) {
        setDesignSettings(designRes.data);
        // Map backend field names to frontend field names
        const data = designRes.data;
        setDesignFormData({
          template: data.templateName || data.template || 'modern',
          primaryColor: data.primaryColor || '#2563eb',
          secondaryColor: data.secondaryColor || '#64748b',
          fontFamily: data.fontFamily === 'Times-Roman' ? 'Times New Roman' :
                      data.fontFamily === 'Helvetica' ? 'Inter' :
                      data.fontFamily || 'Inter',
          showLogo: data.showLogo ?? true,
          showWatermark: data.showWatermark ?? false,
          showFooter: data.showFooterInfo ?? data.showFooter ?? true,
          showQrCode: data.showQrCode ?? true,
          margin: data.margin || 'standard',
        });
      }

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await settingsApi.update(formData);
      if (response.success) {
        setSettings(response.data || null);
        alert('Einstellungen gespeichert');
      } else {
        alert(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDesign = async () => {
    setSaving(true);
    try {
      // Find the selected template to get its settings
      const selectedTemplate = templates.find(t => t.name === designFormData.template);
      const templateSettings = selectedTemplate?.settings as Record<string, string> | undefined;

      // Map frontend field names to backend field names
      // Include all template settings plus user overrides
      const backendData = {
        templateName: designFormData.template,
        primaryColor: designFormData.primaryColor,
        secondaryColor: designFormData.secondaryColor,
        textColor: templateSettings?.textColor || '#000000',
        backgroundColor: templateSettings?.backgroundColor || '#ffffff',
        tableHeaderBg: templateSettings?.tableHeaderBg || '#eff6ff',
        accentColor: templateSettings?.accentColor || '#0ea5e9',
        logoPosition: templateSettings?.logoPosition || 'left',
        logoSize: templateSettings?.logoSize || 'medium',
        fontFamily: designFormData.fontFamily === 'Inter' ? 'Helvetica' :
                    designFormData.fontFamily === 'Roboto' ? 'Helvetica' :
                    designFormData.fontFamily === 'Open Sans' ? 'Helvetica' :
                    designFormData.fontFamily === 'Times New Roman' ? 'Times-Roman' :
                    templateSettings?.fontFamily || 'Helvetica',
        showLogo: designFormData.showLogo,
        showCompanyLogo: designFormData.showLogo,
        showBankInfo: true,
        showFooterInfo: designFormData.showFooter,
        showWatermark: designFormData.showWatermark,
        showQrCode: designFormData.showQrCode,
      };

      console.log('[Settings] Saving design settings:', backendData);

      const response = await invoiceDesignApi.update(backendData);
      if (response.success && response.data) {
        setDesignSettings(response.data);
        alert('Design-Einstellungen gespeichert');
      } else {
        alert('Fehler beim Speichern der Design-Einstellungen');
      }
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Fehler beim Speichern der Design-Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Die Passwörter stimmen nicht überein');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Das neue Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    try {
      const response = await authApi.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        alert('Passwort erfolgreich geändert');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        alert(response.error || 'Fehler beim Ändern des Passworts');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Fehler beim Ändern des Passworts');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Kontoeinstellungen und Präferenzen.
        </p>
      </div>

      <Tabs defaultValue="invoice" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="invoice">
            <FileText className="mr-2 h-4 w-4" />
            Rechnungen
          </TabsTrigger>
          <TabsTrigger value="design">
            <Palette className="mr-2 h-4 w-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Benachrichtigungen
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-2 h-4 w-4" />
            Sicherheit
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rechnungseinstellungen</CardTitle>
              <CardDescription>Standardwerte für neue Rechnungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Rechnungsnummer-Präfix</Label>
                  <Input
                    id="invoicePrefix"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData((prev) => ({ ...prev, invoicePrefix: e.target.value }))}
                    placeholder="RE-"
                  />
                  <p className="text-sm text-muted-foreground">
                    Nächste Rechnungsnummer: {formData.invoicePrefix}{String(settings?.nextInvoiceNumber || 1).padStart(5, '0')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultPaymentDays">Standard-Zahlungsziel (Tage)</Label>
                  <Input
                    id="defaultPaymentDays"
                    type="number"
                    min="1"
                    value={formData.defaultPaymentDays}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultPaymentDays: parseInt(e.target.value) || 14 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Standard-MwSt.-Satz (%)</Label>
                  <Select
                    value={formData.defaultTaxRate.toString()}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, defaultTaxRate: parseFloat(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="19">19%</SelectItem>
                      <SelectItem value="7">7%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Währung</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="CHF">Schweizer Franken (CHF)</SelectItem>
                      <SelectItem value="USD">US-Dollar (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rechnungsdesign</CardTitle>
              <CardDescription>Passen Sie das Aussehen Ihrer Rechnungen an</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Templates */}
              <div className="space-y-4">
                <Label>Vorlage auswählen</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {templates.map((template) => {
                    const s = template.settings;
                    const logoSize = s.logoSize === 'large' ? 28 : s.logoSize === 'small' ? 16 : 22;

                    return (
                      <div
                        key={template.name}
                        className={cn(
                          "cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-primary/50 hover:shadow-md",
                          designFormData.template === template.name
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-muted"
                        )}
                        onClick={() => setDesignFormData(prev => ({
                          ...prev,
                          template: template.name,
                          primaryColor: template.settings.primaryColor,
                          secondaryColor: template.settings.secondaryColor,
                        }))}
                      >
                        {/* Realistic Mini Invoice Preview with Example Data */}
                        <div
                          className="aspect-[210/297] bg-white border rounded shadow-sm mb-3 overflow-hidden flex flex-col relative"
                          style={{ padding: '8px' }}
                        >
                          {/* === HEADER SECTION === */}
                          <div className={cn(
                            "flex mb-3 gap-2",
                            s.logoPosition === 'center' ? "flex-col items-center" :
                            s.logoPosition === 'right' ? "flex-row-reverse justify-between" : "flex-row justify-between"
                          )}>
                            {/* Logo */}
                            <div
                              className="rounded flex items-center justify-center text-white font-bold"
                              style={{
                                backgroundColor: s.primaryColor,
                                width: logoSize,
                                height: logoSize,
                                fontSize: logoSize * 0.35,
                              }}
                            >
                              AB
                            </div>

                            {/* Company Info (opposite side of logo) */}
                            {s.logoPosition !== 'center' && (
                              <div className={cn(
                                "flex flex-col",
                                s.logoPosition === 'right' ? "items-start" : "items-end"
                              )} style={{ fontSize: '4px', lineHeight: '1.3' }}>
                                <span style={{ color: s.primaryColor, fontWeight: 'bold' }}>Muster GmbH</span>
                                <span className="text-gray-500">Musterstr. 1</span>
                                <span className="text-gray-500">12345 Berlin</span>
                              </div>
                            )}
                          </div>

                          {/* Center logo - company info below */}
                          {s.logoPosition === 'center' && (
                            <div className="flex flex-col items-center mb-2" style={{ fontSize: '4px', lineHeight: '1.3' }}>
                              <span style={{ color: s.primaryColor, fontWeight: 'bold' }}>Muster GmbH</span>
                              <span className="text-gray-500">Musterstr. 1, 12345 Berlin</span>
                            </div>
                          )}

                          {/* === ADDRESS & INVOICE INFO === */}
                          <div className="flex justify-between mb-2 gap-2" style={{ fontSize: '3.5px', lineHeight: '1.4' }}>
                            {/* Customer Address */}
                            <div className="flex flex-col text-gray-600">
                              <span className="text-gray-400" style={{ fontSize: '3px' }}>Rechnungsempfänger</span>
                              <span className="font-medium text-gray-800">Kunde AG</span>
                              <span>Max Mustermann</span>
                              <span>Kundenweg 5</span>
                              <span>54321 München</span>
                            </div>
                            {/* Invoice Details */}
                            <div className="flex flex-col items-end text-gray-600">
                              <span><span className="text-gray-400">Nr:</span> RE-2024-001</span>
                              <span><span className="text-gray-400">Datum:</span> 15.01.2024</span>
                              <span><span className="text-gray-400">Fällig:</span> 29.01.2024</span>
                            </div>
                          </div>

                          {/* === INVOICE TITLE === */}
                          <div
                            className="font-bold mb-2"
                            style={{ color: s.primaryColor, fontSize: '6px' }}
                          >
                            RECHNUNG
                          </div>

                          {/* === TABLE === */}
                          <div className="flex-1 flex flex-col" style={{ fontSize: '3px' }}>
                            {/* Table Header */}
                            <div
                              className="flex gap-1 px-1 py-0.5"
                              style={{ backgroundColor: s.tableHeaderBg }}
                            >
                              <span className="flex-[3] font-bold" style={{ color: s.primaryColor }}>Beschreibung</span>
                              <span className="flex-1 text-right font-bold" style={{ color: s.primaryColor }}>Menge</span>
                              <span className="flex-1 text-right font-bold" style={{ color: s.primaryColor }}>Preis</span>
                              <span className="flex-1 text-right font-bold" style={{ color: s.primaryColor }}>Gesamt</span>
                            </div>

                            {/* Table Rows */}
                            <div className="border-x border-b border-gray-200">
                              <div className="flex gap-1 px-1 py-0.5 text-gray-700">
                                <span className="flex-[3]">Beratung</span>
                                <span className="flex-1 text-right">8</span>
                                <span className="flex-1 text-right">150,00</span>
                                <span className="flex-1 text-right">1.200,00</span>
                              </div>
                              <div className="flex gap-1 px-1 py-0.5 bg-gray-50 text-gray-700">
                                <span className="flex-[3]">Entwicklung</span>
                                <span className="flex-1 text-right">20</span>
                                <span className="flex-1 text-right">120,00</span>
                                <span className="flex-1 text-right">2.400,00</span>
                              </div>
                              <div className="flex gap-1 px-1 py-0.5 text-gray-700">
                                <span className="flex-[3]">Support</span>
                                <span className="flex-1 text-right">5</span>
                                <span className="flex-1 text-right">80,00</span>
                                <span className="flex-1 text-right">400,00</span>
                              </div>
                            </div>
                          </div>

                          {/* === TOTALS === */}
                          <div className="flex justify-end mt-2" style={{ fontSize: '3.5px' }}>
                            <div className="flex flex-col gap-0.5" style={{ width: '50%' }}>
                              <div className="flex justify-between text-gray-600">
                                <span>Netto</span>
                                <span>4.000,00 €</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span>MwSt. 19%</span>
                                <span>760,00 €</span>
                              </div>
                              <div
                                className="flex justify-between font-bold pt-0.5 mt-0.5"
                                style={{ borderTop: `1px solid ${s.primaryColor}`, color: s.primaryColor }}
                              >
                                <span>Gesamt</span>
                                <span>4.760,00 €</span>
                              </div>
                            </div>
                          </div>

                          {/* === FOOTER === */}
                          <div
                            className="mt-auto pt-1 flex justify-between gap-1 text-gray-500"
                            style={{ borderTop: `1px solid ${s.secondaryColor}30`, fontSize: '2.5px' }}
                          >
                            <div className="flex flex-col">
                              <span style={{ color: s.secondaryColor }}>Bank</span>
                              <span>DE89 3704 0044 0532</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span style={{ color: s.secondaryColor }}>Kontakt</span>
                              <span>info@muster.de</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span style={{ color: s.secondaryColor }}>USt-IdNr.</span>
                              <span>DE123456789</span>
                            </div>
                          </div>
                        </div>

                        {/* Template Info */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-medium text-sm block truncate">{template.displayName}</span>
                            <span className="text-xs text-muted-foreground line-clamp-2">{template.description}</span>
                          </div>
                          {designFormData.template === template.name && (
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primärfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={designFormData.primaryColor}
                      onChange={(e) => setDesignFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={designFormData.primaryColor}
                      onChange={(e) => setDesignFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Schriftart</Label>
                  <Select
                    value={designFormData.fontFamily}
                    onValueChange={(value) => setDesignFormData(prev => ({ ...prev, fontFamily: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter (Standard)</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="margin">Seitenränder</Label>
                  <Select
                    value={designFormData.margin}
                    onValueChange={(value) => setDesignFormData(prev => ({ ...prev, margin: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Kompakt</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="wide">Breit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Anzeigeoptionen</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between border rounded-lg p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Logo anzeigen</Label>
                      <p className="text-sm text-muted-foreground">Firmenlogo auf der Rechnung anzeigen</p>
                    </div>
                    <Switch
                      checked={designFormData.showLogo}
                      onCheckedChange={(checked) => setDesignFormData(prev => ({ ...prev, showLogo: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between border rounded-lg p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Fußzeile anzeigen</Label>
                      <p className="text-sm text-muted-foreground">Bankverbindung und Firmendaten unten</p>
                    </div>
                    <Switch
                      checked={designFormData.showFooter}
                      onCheckedChange={(checked) => setDesignFormData(prev => ({ ...prev, showFooter: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between border rounded-lg p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">QR-Code anzeigen</Label>
                      <p className="text-sm text-muted-foreground">EPC-QR-Code für Banking-Apps</p>
                    </div>
                    <Switch
                      checked={designFormData.showQrCode}
                      onCheckedChange={(checked) => setDesignFormData(prev => ({ ...prev, showQrCode: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between border rounded-lg p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Wasserzeichen</Label>
                      <p className="text-sm text-muted-foreground">Status (Entwurf/Bezahlt) als Hintergrund</p>
                    </div>
                    <Switch
                      checked={designFormData.showWatermark}
                      onCheckedChange={(checked) => setDesignFormData(prev => ({ ...prev, showWatermark: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveDesign} disabled={saving}>
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Design speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail-Benachrichtigungen</CardTitle>
              <CardDescription>Verwalten Sie Ihre E-Mail-Präferenzen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>E-Mail-Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    Erhalten Sie E-Mails bei wichtigen Ereignissen (z.B. überfällige Rechnungen)
                  </p>
                </div>
                <Switch
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, emailNotifications: checked }))}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Passwort ändern</CardTitle>
              <CardDescription>Ändern Sie Ihr Kontopasswort</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Neues Passwort</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                  <p className="text-sm text-muted-foreground">Mindestens 8 Zeichen</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Passwort ändern</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benutzerprofil</CardTitle>
              <CardDescription>Ihre Kontoinformationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">E-Mail</Label>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Rolle</Label>
                      <p className="font-medium">{user.role === 'admin' ? 'Administrator' : 'Benutzer'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Mitglied seit</Label>
                      <p className="font-medium">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '-'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}