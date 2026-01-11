'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Mail,
    Lock,
    User,
    Loader2,
    ArrowRight,
    Eye,
    EyeOff,
    Sparkles,
} from 'lucide-react';

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, authLoading, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await login(formData.email, formData.password);
            if (response.success) {
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

        try {
            const response = await register(formData.email, formData.password, formData.name);
            if (response.success) {
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

    // Show loading while checking auth status
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <div className="w-full max-w-[450px] bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
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
                    <h1 className="text-xl font-semibold text-center mb-4">
                        {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
                    </h1>

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

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => router.push('/')}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Zurück zur Startseite
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
