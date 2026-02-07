'use client';

import { Layers, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function Navbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#121212]/80 backdrop-blur-lg"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-[#4DA2FF]" />
          <span className="text-xl font-bold text-white">LayerSplit</span>
        </div>
        {mounted && (
          <Button
            variant="outline"
            className="border-[#4DA2FF]/30 bg-[#4DA2FF]/10 text-white hover:bg-[#4DA2FF]/20 hover:border-[#4DA2FF]/50"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </div>
    </motion.nav>
  );
}
