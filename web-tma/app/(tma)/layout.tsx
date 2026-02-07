import '../globals.css';
import '@mysten/dapp-kit/dist/index.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '../providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'LayerSplit',
    description: 'Split bills with friends on Sui',
};

export default function TMALayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <head>
                <script src="https://telegram.org/js/telegram-web-app.js" />
            </head>
            <body className={`${inter.className} bg-[#0a0a0b]`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
