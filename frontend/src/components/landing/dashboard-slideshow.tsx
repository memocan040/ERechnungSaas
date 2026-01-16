'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Monitor, Moon, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Screenshot {
    id: string;
    title: string;
    description: string;
    lightSrc: string;
    darkSrc: string;
    badge?: string;
    badgeColor?: string;
}

const screenshots: Screenshot[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Übersichtliches Dashboard mit allen wichtigen Kennzahlen auf einen Blick',
        lightSrc: '/screenshots/dashboard_light.png',
        darkSrc: '/screenshots/dashboard_dark.png',
        badge: 'Highlights',
        badgeColor: 'from-violet-500 to-purple-600',
    },
    {
        id: 'invoices',
        title: 'Rechnungen',
        description: 'Professionelle Rechnungserstellung mit ZUGFeRD und XRechnung Export',
        lightSrc: '/screenshots/invoices_light.png',
        darkSrc: '/screenshots/invoices_dark.png',
        badge: 'Kernfunktion',
        badgeColor: 'from-blue-500 to-cyan-500',
    },
    {
        id: 'invoices/new',
        title: 'Neue Rechnung',
        description: 'Intuitive Rechnungserstellung mit Live-Vorschau und automatischer Berechnung',
        lightSrc: '/screenshots/invoice_new_light.png',
        darkSrc: '/screenshots/invoice_new_dark.png',
        badge: 'Workflow',
        badgeColor: 'from-sky-500 to-blue-500',
    },
    {
        id: 'quotes',
        title: 'Angebote',
        description: 'Erstellen Sie professionelle Angebote und wandeln Sie diese in Rechnungen um',
        lightSrc: '/screenshots/quotes_light.png',
        darkSrc: '/screenshots/quotes_dark.png',
        badge: 'Sales',
        badgeColor: 'from-fuchsia-500 to-purple-500',
    },
    {
        id: 'quotes/new',
        title: 'Neues Angebot',
        description: 'Schnelle Angebotserstellung mit Gültigkeitsdatum und Bedingungen',
        lightSrc: '/screenshots/quote_new_light.png',
        darkSrc: '/screenshots/quote_new_dark.png',
        badge: 'Workflow',
        badgeColor: 'from-violet-500 to-fuchsia-500',
    },
    {
        id: 'customers',
        title: 'Kundenverwaltung',
        description: 'Übersichtliche Verwaltung aller Geschäftskontakte und Stammdaten',
        lightSrc: '/screenshots/customers_light.png',
        darkSrc: '/screenshots/customers_dark.png',
        badge: 'CRM',
        badgeColor: 'from-emerald-500 to-teal-500',
    },
    {
        id: 'expenses',
        title: 'Ausgaben',
        description: 'Effiziente Verwaltung und Kategorisierung aller Geschäftsausgaben',
        lightSrc: '/screenshots/expenses_light.png',
        darkSrc: '/screenshots/expenses_dark.png',
        badge: 'Buchhaltung',
        badgeColor: 'from-pink-500 to-rose-500',
    },
    {
        id: 'reports',
        title: 'Berichte & Analysen',
        description: 'Umfassende Statistiken, Umsatzanalysen und CSV-Export',
        lightSrc: '/screenshots/reports_light.png',
        darkSrc: '/screenshots/reports_dark.png',
        badge: 'Analytics',
        badgeColor: 'from-orange-500 to-amber-500',
    },
    {
        id: 'company',
        title: 'Unternehmensprofil',
        description: 'Alle Firmendaten, Steuernummern und Bankverbindungen zentral verwalten',
        lightSrc: '/screenshots/company_light.png',
        darkSrc: '/screenshots/company_dark.png',
        badge: 'Einstellungen',
        badgeColor: 'from-indigo-500 to-violet-500',
    },
];

export function DashboardSlideshow() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const goToNext = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % screenshots.length);
            setProgress(0);
            setIsTransitioning(false);
        }, 150);
    }, []);

    const goToPrevious = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
            setProgress(0);
            setIsTransitioning(false);
        }, 150);
    }, []);

    const goToSlide = (index: number) => {
        if (index === currentIndex) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setProgress(0);
            setIsTransitioning(false);
        }, 150);
    };

    // Auto-advance slideshow with progress bar
    useEffect(() => {
        if (!isPlaying || isHovered) {
            return;
        }

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    goToNext();
                    return 0;
                }
                return prev + 2;
            });
        }, 100);

        return () => clearInterval(progressInterval);
    }, [isPlaying, isHovered, goToNext]);

    const currentScreenshot = screenshots[currentIndex];
    const imageSrc = isDarkMode ? currentScreenshot.darkSrc : currentScreenshot.lightSrc;

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main Screenshot Container */}
            <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-card group">
                {/* Decorative gradient border */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/50 via-primary/20 to-primary/50 rounded-2xl lg:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                {/* Browser Chrome */}
                <div className="bg-gradient-to-r from-muted/90 to-muted/70 px-4 py-3 border-b border-border/50 flex items-center gap-2 backdrop-blur-sm">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer" />
                        <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer" />
                    </div>
                    <div className="flex-1 mx-4">
                        <div className="bg-background/60 rounded-lg px-4 py-1.5 text-sm text-muted-foreground text-center max-w-md mx-auto border border-border/50 flex items-center justify-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500/80 animate-pulse" />
                            <span>app.erechnung.de/{currentScreenshot.id}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {/* Play/Pause */}
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="p-2 rounded-lg hover:bg-accent transition-colors relative z-20"
                            title={isPlaying ? 'Pausieren' : 'Abspielen'}
                        >
                            {isPlaying ? (
                                <Pause className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <Play className="w-4 h-4 text-muted-foreground" />
                            )}
                        </button>

                        {/* Dark/Light Mode Toggle */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={cn(
                                'p-2 rounded-lg transition-all relative z-20',
                                isDarkMode
                                    ? 'bg-primary/10 hover:bg-primary/20'
                                    : 'hover:bg-accent'
                            )}
                            title={isDarkMode ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
                        >
                            {isDarkMode ? (
                                <Moon className="w-4 h-4 text-primary" />
                            ) : (
                                <Monitor className="w-4 h-4 text-muted-foreground" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute top-[52px] left-0 right-0 h-0.5 bg-border/30 z-30">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Screenshot Image */}
                <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                    <Image
                        src={imageSrc}
                        alt={currentScreenshot.title}
                        fill
                        className={cn(
                            'object-cover object-top transition-all duration-300',
                            isTransitioning ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
                        )}
                        priority
                    />

                    {/* Gradient overlay at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />

                    {/* Feature Badge */}
                    {currentScreenshot.badge && (
                        <div className={cn(
                            'absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold text-white',
                            'bg-gradient-to-r shadow-lg',
                            currentScreenshot.badgeColor,
                            'transition-all duration-300',
                            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                        )}>
                            {currentScreenshot.badge}
                        </div>
                    )}

                    {/* Navigation Arrows */}
                    <button
                        onClick={goToPrevious}
                        className={cn(
                            'absolute left-4 top-1/2 -translate-y-1/2 z-20',
                            'w-12 h-12 rounded-full bg-background/90 backdrop-blur-md',
                            'flex items-center justify-center border border-border/50',
                            'opacity-0 group-hover:opacity-100 transition-all duration-300',
                            'hover:bg-background hover:scale-110 hover:shadow-xl',
                            'active:scale-95'
                        )}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={goToNext}
                        className={cn(
                            'absolute right-4 top-1/2 -translate-y-1/2 z-20',
                            'w-12 h-12 rounded-full bg-background/90 backdrop-blur-md',
                            'flex items-center justify-center border border-border/50',
                            'opacity-0 group-hover:opacity-100 transition-all duration-300',
                            'hover:bg-background hover:scale-110 hover:shadow-xl',
                            'active:scale-95'
                        )}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Info Bar */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
                        <div className="flex items-end justify-between gap-4">
                            <div className={cn(
                                'transition-all duration-300',
                                isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                            )}>
                                <h3 className="text-xl lg:text-2xl font-bold mb-1">{currentScreenshot.title}</h3>
                                <p className="text-muted-foreground text-sm lg:text-base max-w-lg">{currentScreenshot.description}</p>
                            </div>

                            {/* Slide Counter */}
                            <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground bg-background/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                <span className="font-semibold text-foreground">{currentIndex + 1}</span>
                                <span>/</span>
                                <span>{screenshots.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex gap-2 lg:gap-3 mt-6 justify-center px-4 overflow-x-auto pb-2">
                {screenshots.map((screenshot, index) => (
                    <button
                        key={screenshot.id}
                        onClick={() => goToSlide(index)}
                        className={cn(
                            'relative rounded-lg lg:rounded-xl overflow-hidden transition-all duration-300 flex-shrink-0',
                            'border-2 focus:outline-none focus:ring-2 focus:ring-primary/50',
                            index === currentIndex
                                ? 'border-primary ring-2 ring-primary/30 scale-105 shadow-lg shadow-primary/20'
                                : 'border-border/30 hover:border-primary/50 opacity-60 hover:opacity-100'
                        )}
                    >
                        <div className="w-20 lg:w-28 h-12 lg:h-16 relative">
                            <Image
                                src={isDarkMode ? screenshot.darkSrc : screenshot.lightSrc}
                                alt={screenshot.title}
                                fill
                                className="object-cover"
                            />
                            {/* Overlay with title */}
                            <div className={cn(
                                'absolute inset-0 flex items-center justify-center',
                                'bg-gradient-to-t from-background/90 via-background/40 to-transparent',
                                'transition-opacity duration-300',
                                index === currentIndex ? 'opacity-0' : 'opacity-100'
                            )}>
                                <span className="text-[10px] lg:text-xs font-medium text-foreground/90 px-1 text-center line-clamp-1">
                                    {screenshot.title}
                                </span>
                            </div>
                        </div>

                        {/* Active indicator dot */}
                        {index === currentIndex && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                    </button>
                ))}
            </div>

            {/* Dots Navigation (Mobile-friendly) */}
            <div className="flex gap-2 mt-4 justify-center sm:hidden">
                {screenshots.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={cn(
                            'w-2 h-2 rounded-full transition-all duration-300',
                            index === currentIndex
                                ? 'bg-primary w-6'
                                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
