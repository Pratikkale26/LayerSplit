'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Landing page components
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { AIScannerSection } from '@/components/AIScannerSection';
import { YieldEngineSection } from '@/components/YieldEngineSection';
import { CetusSection } from '@/components/CetusSection';
import { Footer } from '@/components/Footer';

export default function Home() {
  const router = useRouter();
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if running inside Telegram WebApp
    if (typeof window !== 'undefined') {
      const telegram = (window as any).Telegram?.WebApp;
      if (telegram?.initData && telegram.initData.length > 0) {
        // We're in Telegram
        telegram.ready();
        telegram.expand();
        setIsTelegram(true);

        // Check for startapp parameter (deep link)
        const startParam = telegram.initDataUnsafe?.start_param;
        if (startParam) {
          // Handle sign_billId format
          if (startParam.startsWith('sign_')) {
            const billId = startParam.replace('sign_', '');
            router.replace(`/app/sign?billId=${billId}`);
            return;
          }
          // Handle create flow (for future use)
          if (startParam.startsWith('create_')) {
            router.replace(`/app/create?${startParam}`);
            return;
          }
        }

        // Default: go to TMA dashboard
        router.replace('/app');
      } else {
        // Not in Telegram - show landing page
        setIsTelegram(false);
      }
    }
  }, [router]);

  // Loading state while detecting context
  if (isTelegram === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If in Telegram, this won't render (redirected)
  if (isTelegram) {
    return null;
  }

  // Landing page for non-Telegram users
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <AIScannerSection />
      <YieldEngineSection />
      <CetusSection />
      <Footer />
    </main>
  );
}
