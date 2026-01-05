'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Monitor, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Screenshot {
    id: string;
    title: string;
    description: string;
    lightSrc: string;
    darkSrc: string;
}

const screenshots: Screenshot[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Übersichtliches Dashboard mit allen wichtigen Kennzahlen',
        lightSrc: '/screenshots/dashboard_light.png',
        darkSrc: '/screenshots/dashboard_dark.png',
    },
    {
        id: 'invoices',
        title: 'Rechnungen',
        description: 'Verwalten Sie alle Ihre Rechnungen an einem Ort',
        lightSrc: '/screenshots/invoices_light.png',
        darkSrc: '/screenshots/invoices_dark.png',
    },
    {
        id: 'customers',
        title: 'Kunden',
        description: 'Kundenstammdaten übersichtlich verwalten',
        lightSrc: '/screenshots/customers_light.png',
        darkSrc: '/screenshots/customers_dark.png',
    },
];

export function DashboardSlideshow() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-advance slideshow
    useEffect(() => {
        if (isHovered) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % screenshots.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [isHovered]);

    const currentScreenshot = screenshots[currentIndex];
    const imageSrc = isDarkMode ? currentScreenshot.darkSrc : currentScreenshot.lightSrc;

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % screenshots.length);
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main Screenshot Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card group">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none z-10" />

                {/* Browser Chrome */}
                <div className="bg-muted/80 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4">
                        <div className="bg-background/50 rounded-lg px-4 py-1.5 text-sm text-muted-foreground text-center max-w-md mx-auto border border-border/50">
                            app.erechnung.de/{currentScreenshot.id}
                        </div>
                    </div>
                    {/* Dark/Light Mode Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors relative z-20"
                        title={isDarkMode ? 'Heller Modus' : 'Dunkler Modus'}
                    >
                        {isDarkMode ? (
                            <Moon className="w-4 h-4 text-primary" />
                        ) : (
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                </div>

                {/* Screenshot Image */}
                <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                    <Image
                        src={imageSrc}
                        alt={currentScreenshot.title}
                        fill
                        className="object-cover object-top transition-opacity duration-500"
                        priority
                    />

                    {/* Navigation Arrows */}
                    <button
                        onClick={goToPrevious}
                        className={cn(
                            'absolute left-4 top-1/2 -translate-y-1/2 z-20',
                            'w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm',
                            'flex items-center justify-center border border-border/50',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'hover:bg-background hover:scale-110 transition-all'
                        )}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNext}
                        className={cn(
                            'absolute right-4 top-1/2 -translate-y-1/2 z-20',
                            'w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm',
                            'flex items-center justify-center border border-border/50',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'hover:bg-background hover:scale-110 transition-all'
                        )}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Info Bar */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-background via-background/90 to-transparent">
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-xl font-semibold mb-1">{currentScreenshot.title}</h3>
                            <p className="text-muted-foreground">{currentScreenshot.description}</p>
                        </div>

                        {/* Dots Navigation */}
                        <div className="flex gap-2">
                            {screenshots.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={cn(
                                        'w-2 h-2 rounded-full transition-all',
                                        index === currentIndex
                                            ? 'bg-primary w-6'
                                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex gap-3 mt-6 justify-center">
                {screenshots.map((screenshot, index) => (
                    <button
                        key={screenshot.id}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                            'relative rounded-lg overflow-hidden transition-all duration-300',
                            'border-2',
                            index === currentIndex
                                ? 'border-primary ring-2 ring-primary/20 scale-105'
                                : 'border-border/50 hover:border-primary/50 opacity-70 hover:opacity-100'
                        )}
                    >
                        <div className="w-24 h-14 relative">
                            <Image
                                src={isDarkMode ? screenshot.darkSrc : screenshot.lightSrc}
                                alt={screenshot.title}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className={cn(
                            'absolute inset-0 flex items-center justify-center text-xs font-medium',
                            'bg-background/60 backdrop-blur-[1px]',
                            index === currentIndex ? 'opacity-0' : 'opacity-100'
                        )}>
                            {screenshot.title}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
