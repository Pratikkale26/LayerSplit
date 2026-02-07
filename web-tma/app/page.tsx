'use client';

import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { AIScannerSection } from '@/components/AIScannerSection';
import { YieldEngineSection } from '@/components/YieldEngineSection';
import { CetusSection } from '@/components/CetusSection';
import { Footer } from '@/components/Footer';

export default function Home() {
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
