import type { Metadata } from 'next';
import { Providers } from '../providers';

export const metadata: Metadata = {
    title: 'LayerSplit',
    description: 'Split bills with friends on Sui',
};

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Providers>
            <div className="min-h-screen bg-[#0a0a0b]">
                {children}
            </div>
        </Providers>
    );
}
