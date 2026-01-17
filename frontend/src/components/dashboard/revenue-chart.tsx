'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { MonthlyRevenue } from '@/types';

interface RevenueChartProps {
  data: MonthlyRevenue[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Prepare chart data with formatted months
  const chartData = [...data].reverse().map((item) => ({
    ...item,
    monthLabel: formatMonth(item.month),
  }));

  // Calculate growth if we have at least 2 months of data
  let growth = 0;
  let hasGrowth = false;
  if (data.length >= 2) {
    const latestMonth = data[0]?.revenue || 0;
    const previousMonth = data[1]?.revenue || 1;
    growth = ((latestMonth - previousMonth) / previousMonth) * 100;
    hasGrowth = true;
  }

  return (
    <Card className="col-span-full lg:col-span-2 animate-fade-in-up opacity-0" style={{ animationDelay: '400ms' }}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl">Umsatz der letzten 12 Monate</CardTitle>
          <CardDescription className="flex items-center gap-2">
            {hasGrowth && growth !== 0 && (
              <span className={`inline-flex items-center gap-1 font-medium ${growth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {growth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(growth).toFixed(1)}% zum Vormonat
              </span>
            )}
            {(!hasGrowth || growth === 0) && (
              <span className="text-muted-foreground">Bezahlte Rechnungen</span>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-600" />
            <span className="text-muted-foreground">Umsatz</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity={1} />
                    <stop offset="100%" stopColor="rgb(124, 58, 237)" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity={1} />
                    <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                  opacity={0.5}
                />
                <XAxis
                  dataKey="monthLabel"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 8 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm p-3 shadow-xl animate-scale-in">
                          <div className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {payload[0].payload.monthLabel}
                            </span>
                            <span className="text-xl font-bold text-foreground">
                              {formatCurrency(payload[0].value as number)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {payload[0].payload.invoiceCount} Rechnungen
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Keine Umsatzdaten vorhanden
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
