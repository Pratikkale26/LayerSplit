'use client';

import { Layers } from 'lucide-react';
import { motion } from 'framer-motion';
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
          <a
            href="https://t.me/LayerSplit_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#4DA2FF]/30 bg-[#4DA2FF]/10 px-4 py-2 text-sm font-medium text-white hover:bg-[#4DA2FF]/20 hover:border-[#4DA2FF]/50 transition-colors"
          >
            Open in Telegram
          </a>
        )}
      </div>
    </motion.nav>
  );
}
