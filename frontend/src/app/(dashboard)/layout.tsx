'use client';

import { Shell } from '@/components/layout';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth check temporarily disabled for screenshots
    return <Shell>{children}</Shell>;
}
