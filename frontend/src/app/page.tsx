'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth';
import { DashboardSlideshow } from '@/components/landing/dashboard-slideshow';
import {
  FileText,
  Zap,
  Shield,
  Globe,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
  Clock,
  Euro,
  Star,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: FileText,
    title: 'ZUGFeRD 2.x & XRechnung',
    description: 'Vollständig konform mit deutschen E-Rechnungsstandards. Automatische Generierung und Validierung.',
  },
  {
    icon: Zap,
    title: 'Blitzschnelle Erstellung',
    description: 'Erstellen Sie professionelle E-Rechnungen in Sekunden mit unserer intuitiven Oberfläche.',
  },
  {
    icon: Shield,
    title: 'DSGVO-konform',
    description: 'Ihre Daten werden sicher in deutschen Rechenzentren gespeichert und verarbeitet.',
  },
  {
    icon: Globe,
    title: 'Factur-X kompatibel',
    description: 'Internationale E-Invoicing Standards für den europäischen Handel.',
  },
  {
    icon: BarChart3,
    title: 'Umfassende Berichte',
    description: 'Behalten Sie den Überblick über Umsätze, offene Posten und Zahlungseingänge.',
  },
  {
    icon: Users,
    title: 'Kundenverwaltung',
    description: 'Verwalten Sie Ihre Geschäftskontakte und erstellen Sie wiederkehrende Rechnungen.',
  },
];

const testimonials = [
  {
    name: 'Thomas Müller',
    role: 'Geschäftsführer, Tech Solutions GmbH',
    content: 'ERechnung hat unsere Buchhaltung revolutioniert. Die ZUGFeRD-Integration spart uns Stunden pro Woche.',
    rating: 5,
  },
  {
    name: 'Anna Schmidt',
    role: 'Freiberuflerin',
    content: 'Endlich eine Software, die E-Rechnungen ohne Kopfschmerzen erstellt. Absolut empfehlenswert!',
    rating: 5,
  },
  {
    name: 'Michael Weber',
    role: 'CFO, Weber & Partner',
    content: 'Die Compliance-Features sind hervorragend. Wir sind immer auf der sicheren Seite.',
    rating: 5,
  },
];

const pricingFeatures = [
  'Unbegrenzte E-Rechnungen',
  'ZUGFeRD 2.x & XRechnung',
  'Factur-X Export',
  'Kundenverwaltung',
  'Berichte & Analysen',
  'PDF mit eingebettetem XML',
  'E-Mail-Versand',
  'Deutsche Server (DSGVO)',
];

export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">ERechnung</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Preise
              </Link>
              <Link href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Bewertungen
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => openAuthModal('login')}>
                Anmelden
              </Button>
              <Button className="gradient-primary text-white" onClick={() => openAuthModal('register')}>
                Kostenlos testen
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border/50">
              <div className="flex flex-col gap-4">
                <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
                <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Preise
                </Link>
                <Link href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                  Bewertungen
                </Link>
                <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                  <Button variant="ghost" onClick={() => openAuthModal('login')}>
                    Anmelden
                  </Button>
                  <Button className="gradient-primary text-white" onClick={() => openAuthModal('register')}>
                    Kostenlos testen
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4" />
              <span>Für B2G ab 2025 verpflichtend</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              E-Rechnungen erstellen,{' '}
              <span className="gradient-text">einfach und konform</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Erstellen Sie professionelle ZUGFeRD- und XRechnung-konforme E-Rechnungen in Sekunden.
              Perfekt für Freelancer, KMUs und Unternehmen in Deutschland.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Button
                size="lg"
                className="gradient-primary text-white text-lg px-8 h-14 shadow-lg hover:shadow-xl transition-all"
                onClick={() => openAuthModal('register')}
              >
                Jetzt starten
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14"
                onClick={() => openAuthModal('login')}
              >
                Demo ansehen
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>ZUGFeRD 2.x zertifiziert</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>XRechnung konform</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>DSGVO-konform</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <DashboardSlideshow />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Alles was Sie brauchen für{' '}
              <span className="gradient-text">E-Invoicing</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unsere Software deckt alle Anforderungen für die elektronische Rechnungsstellung in Deutschland ab.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 card-hover"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300',
                  'bg-primary/10 group-hover:bg-primary group-hover:scale-110'
                )}>
                  <feature.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Einfache, transparente{' '}
              <span className="gradient-text">Preise</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ein Plan, alle Features. Keine versteckten Kosten.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative p-8 rounded-3xl bg-card border-2 border-primary/30 shadow-xl">
              {/* Popular badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1 rounded-full gradient-primary text-white text-sm font-medium">
                  Beliebteste Wahl
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">ERechnung Pro</h3>
                <div className="flex items-end justify-center gap-1 mb-2">
                  <Euro className="w-8 h-8 text-primary" />
                  <span className="text-5xl font-bold">3,99</span>
                  <span className="text-muted-foreground mb-2">/Monat</span>
                </div>
                <p className="text-muted-foreground">Jährliche Abrechnung · Jederzeit kündbar</p>
              </div>

              <div className="space-y-4 mb-8">
                {pricingFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full gradient-primary text-white h-12 text-lg"
                onClick={() => openAuthModal('register')}
              >
                Jetzt starten
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>14 Tage kostenlos testen</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Was unsere Kunden{' '}
              <span className="gradient-text">sagen</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Über 1.000 zufriedene Nutzer vertrauen ERechnung für ihre E-Invoicing Bedürfnisse.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="p-6 rounded-2xl bg-card border border-border/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl gradient-primary relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%27%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Bereit für E-Invoicing?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Starten Sie noch heute und erstellen Sie Ihre erste E-Rechnung in weniger als 5 Minuten.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 text-lg px-8 h-14"
                  onClick={() => openAuthModal('register')}
                >
                  Kostenlos starten
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 text-lg px-8 h-14"
                  onClick={() => openAuthModal('login')}
                >
                  Anmelden
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">ERechnung</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">
                Impressum
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Datenschutz
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                AGB
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Kontakt
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 ERechnung. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  );
}
