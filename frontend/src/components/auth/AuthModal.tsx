'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import {
    Mail,
    Lock,
    User,
    Loader2,
    Check,
    CreditCard,
    Shield,
    Sparkles,
    ArrowRight,
    Eye,
    EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register' | 'payment'>(defaultMode);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { login, register } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // Payment state
    const [paymentData, setPaymentData] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardName: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        const name = e.target.name;

        // Format card number
        if (name === 'cardNumber') {
            value = value.replace(/\D/g, '').slice(0, 16);
            value = value.replace(/(\d{4})/g, '$1 ').trim();
        }

        // Format expiry date
        if (name === 'expiryDate') {
            value = value.replace(/\D/g, '').slice(0, 4);
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
        }

        // Format CVV
        if (name === 'cvv') {
            value = value.replace(/\D/g, '').slice(0, 3);
        }

        setPaymentData({ ...paymentData, [name]: value });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await login(formData.email, formData.password);
            if (response.success) {
                onClose();
                router.push('/dashboard');
            } else {
                setError(response.error || 'Anmeldung fehlgeschlagen');
            }
        } catch {
            setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError('Passwörter stimmen nicht überein');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Passwort muss mindestens 8 Zeichen lang sein');
            setIsLoading(false);
            return;
        }

        // Register directly (paywall temporarily disabled for testing)
        try {
            const response = await register(formData.email, formData.password, formData.name);
            if (response.success) {
                onClose();
                router.push('/dashboard');
            } else {
                setError(response.error || 'Registrierung fehlgeschlagen');
            }
        } catch {
            setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulate payment processing
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
            const response = await register(formData.email, formData.password, formData.name);
            if (response.success) {
                onClose();
                router.push('/dashboard');
            } else {
                setError(response.error || 'Registrierung fehlgeschlagen');
            }
        } catch {
            setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetModal = () => {
        setMode(defaultMode);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setPaymentData({ cardNumber: '', expiryDate: '', cvv: '', cardName: '' });
        setError('');
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    resetModal();
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-card border-border/50">
                {/* Decorative gradient header */}
                <div className="relative h-28 gradient-primary overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%27%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-white">
                                <h2 className="text-xl font-bold">ERechnung</h2>
                                <p className="text-white/80 text-sm">E-Invoicing für Deutschland</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-4">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-semibold text-center">
                            {mode === 'login' && 'Willkommen zurück'}
                            {mode === 'register' && 'Konto erstellen'}
                            {mode === 'payment' && 'Abo abschließen'}
                        </DialogTitle>
                    </DialogHeader>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    E-Mail-Adresse
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="name@beispiel.de"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    Passwort
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" className="w-full gradient-primary text-white" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Wird angemeldet...
                                    </>
                                ) : (
                                    <>
                                        Anmelden
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>

                            <div className="text-center text-sm text-muted-foreground">
                                Noch kein Konto?{' '}
                                <button
                                    type="button"
                                    onClick={() => setMode('register')}
                                    className="text-primary font-medium hover:underline"
                                >
                                    Jetzt registrieren
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Register Form */}
                    {mode === 'register' && (
                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">
                                    Vollständiger Name
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        placeholder="Max Mustermann"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="register-email" className="text-sm font-medium">
                                    E-Mail-Adresse
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="register-email"
                                        name="email"
                                        type="email"
                                        placeholder="name@beispiel.de"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="register-password" className="text-sm font-medium">
                                    Passwort
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="register-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Mindestens 8 Zeichen"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                    Passwort bestätigen
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Passwort wiederholen"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full gradient-primary text-white" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Wird registriert...
                                    </>
                                ) : (
                                    <>
                                        Konto erstellen
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>

                            <div className="text-center text-sm text-muted-foreground">
                                Bereits ein Konto?{' '}
                                <button
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className="text-primary font-medium hover:underline"
                                >
                                    Jetzt anmelden
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Payment Form */}
                    {mode === 'payment' && (
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            {/* Pricing info */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-medium">ERechnung Pro</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold">€3,99</span>
                                        <span className="text-muted-foreground text-sm">/Monat</span>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-primary" />
                                        <span>Unbegrenzte E-Rechnungen</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-primary" />
                                        <span>ZUGFeRD 2.x & XRechnung Support</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-primary" />
                                        <span>Kundenverwaltung</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-primary" />
                                        <span>Berichte & Analysen</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cardName" className="text-sm font-medium">
                                    Name auf der Karte
                                </Label>
                                <Input
                                    id="cardName"
                                    name="cardName"
                                    type="text"
                                    placeholder="Max Mustermann"
                                    value={paymentData.cardName}
                                    onChange={handlePaymentChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cardNumber" className="text-sm font-medium">
                                    Kartennummer
                                </Label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="cardNumber"
                                        name="cardNumber"
                                        type="text"
                                        placeholder="1234 5678 9012 3456"
                                        value={paymentData.cardNumber}
                                        onChange={handlePaymentChange}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="expiryDate" className="text-sm font-medium">
                                        Gültig bis
                                    </Label>
                                    <Input
                                        id="expiryDate"
                                        name="expiryDate"
                                        type="text"
                                        placeholder="MM/JJ"
                                        value={paymentData.expiryDate}
                                        onChange={handlePaymentChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cvv" className="text-sm font-medium">
                                        CVV
                                    </Label>
                                    <Input
                                        id="cvv"
                                        name="cvv"
                                        type="text"
                                        placeholder="123"
                                        value={paymentData.cvv}
                                        onChange={handlePaymentChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Shield className="w-4 h-4" />
                                <span>Sichere Zahlung mit SSL-Verschlüsselung</span>
                            </div>

                            <Button type="submit" className="w-full gradient-primary text-white" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Wird verarbeitet...
                                    </>
                                ) : (
                                    <>
                                        Jetzt für €3,99/Monat abonnieren
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setMode('register')}
                                className={cn(
                                    'w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors'
                                )}
                            >
                                ← Zurück zur Registrierung
                            </button>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
