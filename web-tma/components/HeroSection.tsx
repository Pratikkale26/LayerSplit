'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4DA2FF]/15 via-transparent to-black" />

      {/* Soft radial glow */}
      <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#4DA2FF]/20 blur-[120px]" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#4DA2FF]/30 bg-[#4DA2FF]/10 px-4 py-2 backdrop-blur"
        >
          <Sparkles className="h-4 w-4 text-[#4DA2FF]" />
          <span className="text-sm text-white/80">
            Built on Sui · Instant settlements
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={!reduceMotion ? { y: 20, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight text-white"
        >
          Split Bills.
          <br />
          <span className="bg-gradient-to-r from-[#4DA2FF] to-[#6BB5FF] bg-clip-text text-transparent">
            Earn Yield.
          </span>
          <br />
          No Awkward Chasing.
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={!reduceMotion ? { y: 16, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-10 max-w-3xl mx-auto text-lg sm:text-xl md:text-2xl text-white/70 leading-relaxed"
        >
          The social settlement layer on Sui.
          Settle group expenses in any token — late payers fund the group.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={!reduceMotion ? { y: 20, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            size="lg"
            className="group relative h-14 rounded-full bg-[#4DA2FF] px-8 text-lg font-semibold text-white transition-all hover:scale-[1.04] hover:bg-[#3D92EF] shadow-lg shadow-[#4DA2FF]/30"
          >
            <span className="flex items-center gap-2">
              Launch on Telegram
              <Send className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-14 rounded-full border-white/20 px-8 text-lg text-white hover:bg-white/5 hover:border-[#4DA2FF]/50"
          >
            See how it works
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
