'use client';

import { useState, useEffect } from 'react';
import { Euro, FileText, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import {
    StatCard,
    RevenueChart,
    StatusChart,
    RecentInvoices,
} from '@/components/dashboard';
import { reportsApi, invoicesApi } from '@/lib/api';
import type { DashboardStats, MonthlyRevenue, StatusDistribution, Invoice } from '@/types';

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
    const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load all dashboard data in parallel
            const [statsRes, revenueRes, statusRes, invoicesRes] = await Promise.all([
                reportsApi.getDashboardStats(),
                reportsApi.getRevenueByMonth(),
                reportsApi.getInvoiceStatusSummary(),
                invoicesApi.getAll({ limit: 5 }),
            ]);

            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
            if (revenueRes.success && revenueRes.data) {
                setMonthlyRevenue(revenueRes.data);
            }
            if (statusRes.success && statusRes.data) {
                setStatusDistribution(statusRes.data);
            }
            if (invoicesRes.success && invoicesRes.data) {
                setRecentInvoices(invoicesRes.data);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Calculate trend (compare current month to last month)
    const currentMonthRevenue = stats?.revenueThisMonth || 0;
    const lastMonthRevenue = stats?.revenueLastMonth || 1; // Avoid division by zero
    const revenueTrend = lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Calculate average invoice value
    const totalInvoices = stats?.totalInvoices || 0;
    const totalRevenue = stats?.totalRevenue || 0;
    const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

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
                    value={formatCurrency(currentMonthRevenue)}
                    icon={Euro}
                    trend={revenueTrend !== 0 ? { value: Math.abs(revenueTrend), isPositive: revenueTrend > 0 } : undefined}
                    description="vs. letzter Monat"
                    iconColor="from-violet-500 to-purple-600"
                    delay={100}
                />
                <StatCard
                    title="Offene Rechnungen"
                    value={formatCurrency(stats?.outstandingAmount || 0)}
                    icon={FileText}
                    description={`${totalInvoices} Rechnungen gesamt`}
                    iconColor="from-blue-500 to-cyan-600"
                    delay={200}
                />
                <StatCard
                    title="Überfällige Beträge"
                    value={formatCurrency(stats?.overdueAmount || 0)}
                    icon={AlertCircle}
                    description="Sofort fällig"
                    iconColor="from-orange-500 to-red-600"
                    delay={300}
                />
                <StatCard
                    title="Durchschn. Rechnungswert"
                    value={formatCurrency(avgInvoiceValue)}
                    icon={TrendingUp}
                    description="Alle Rechnungen"
                    iconColor="from-emerald-500 to-teal-600"
                    delay={400}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 lg:grid-cols-3">
                <RevenueChart data={monthlyRevenue} />
                <StatusChart data={statusDistribution} />
            </div>

            {/* Recent Invoices */}
            <RecentInvoices
                invoices={recentInvoices}
                stats={{
                    outstanding: stats?.outstandingAmount || 0,
                    overdue: stats?.overdueAmount || 0,
                    total: totalInvoices,
                }}
            />
        </div>
    );
}
