'use client';

import { Euro, FileText, AlertCircle, TrendingUp } from 'lucide-react';
import {
    StatCard,
    RevenueChart,
    StatusChart,
    RecentInvoices,
} from '@/components/dashboard';
import { dashboardStats, formatCurrency } from '@/lib/mock-data';

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="animate-fade-in-up opacity-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Willkommen zurück! Hier ist Ihre Geschäftsübersicht.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Umsatz (aktueller Monat)"
                    value={formatCurrency(dashboardStats.totalRevenue)}
                    icon={Euro}
                    trend={{ value: 12.5, isPositive: true }}
                    description="vs. letzter Monat"
                    iconColor="from-violet-500 to-purple-600"
                    delay={100}
                />
                <StatCard
                    title="Offene Rechnungen"
                    value={formatCurrency(dashboardStats.outstandingInvoices)}
                    icon={FileText}
                    description={`${dashboardStats.totalInvoices} Rechnungen gesamt`}
                    iconColor="from-blue-500 to-cyan-600"
                    delay={200}
                />
                <StatCard
                    title="Überfällige Beträge"
                    value={formatCurrency(dashboardStats.overdueAmount)}
                    icon={AlertCircle}
                    trend={{ value: 5.2, isPositive: false }}
                    description="vs. letzter Monat"
                    iconColor="from-orange-500 to-red-600"
                    delay={300}
                />
                <StatCard
                    title="Durchschn. Rechnungswert"
                    value={formatCurrency(dashboardStats.totalRevenue / 12)}
                    icon={TrendingUp}
                    trend={{ value: 8.1, isPositive: true }}
                    description="letzte 12 Monate"
                    iconColor="from-emerald-500 to-teal-600"
                    delay={400}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 lg:grid-cols-3">
                <RevenueChart />
                <StatusChart />
            </div>

            {/* Recent Invoices */}
            <RecentInvoices />
        </div>
    );
}
