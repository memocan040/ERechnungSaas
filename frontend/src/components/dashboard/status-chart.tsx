'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { statusDistribution } from '@/lib/mock-data';

const COLORS = {
  draft: {
    color: 'rgb(148, 163, 184)',
    gradient: ['rgb(148, 163, 184)', 'rgb(100, 116, 139)'],
  },
  sent: {
    color: 'rgb(59, 130, 246)',
    gradient: ['rgb(96, 165, 250)', 'rgb(37, 99, 235)'],
  },
  paid: {
    color: 'rgb(34, 197, 94)',
    gradient: ['rgb(74, 222, 128)', 'rgb(22, 163, 74)'],
  },
  overdue: {
    color: 'rgb(239, 68, 68)',
    gradient: ['rgb(248, 113, 113)', 'rgb(220, 38, 38)'],
  },
};

const STATUS_LABELS = {
  draft: { label: 'Entwurf', icon: '📝' },
  sent: { label: 'Versendet', icon: '📤' },
  paid: { label: 'Bezahlt', icon: '✅' },
  overdue: { label: 'Überfällig', icon: '⚠️' },
};

export function StatusChart() {
  const data = statusDistribution.map((item) => ({
    name: item.label,
    value: item.count,
    status: item.status,
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '500ms' }}>
      <CardHeader>
        <CardTitle className="text-xl">Rechnungsstatus</CardTitle>
        <CardDescription>{total} Rechnungen insgesamt</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {Object.entries(COLORS).map(([key, value]) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={value.gradient[0]} />
                    <stop offset="100%" stopColor={value.gradient[1]} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.status}`}
                    fill={`url(#gradient-${entry.status})`}
                    className="transition-all duration-300 hover:opacity-80"
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const statusInfo = STATUS_LABELS[data.status as keyof typeof STATUS_LABELS];
                    const percentage = ((data.value / total) * 100).toFixed(1);
                    return (
                      <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm p-3 shadow-xl animate-scale-in">
                        <div className="grid gap-1.5">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <span>{statusInfo.icon}</span>
                            {data.name}
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                              {data.value}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-3xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Gesamt</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {data.map((item) => {
            const statusInfo = STATUS_LABELS[item.status as keyof typeof STATUS_LABELS];
            const colorInfo = COLORS[item.status as keyof typeof COLORS];
            const percentage = ((item.value / total) * 100).toFixed(0);

            return (
              <div
                key={item.status}
                className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <div
                  className="h-3 w-3 rounded-full shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${colorInfo.gradient[0]}, ${colorInfo.gradient[1]})`
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.value} ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
