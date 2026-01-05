'use client';

import { useState, useEffect } from 'react';
import { Save, User, FileText, Bell, Lock } from 'lucide-react';
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
import { settingsApi, authApi } from '@/lib/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [formData, setFormData] = useState({
    defaultTaxRate: 19,
    defaultPaymentDays: 14,
    invoicePrefix: 'RE-',
    currency: 'EUR',
    language: 'de',
    emailNotifications: true,
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
      const [userRes, settingsRes] = await Promise.all([
        authApi.getCurrentUser(),
        settingsApi.get(),
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
        <TabsList>
          <TabsTrigger value="invoice">
            <FileText className="mr-2 h-4 w-4" />
            Rechnungen
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
