'use client';

import { motion } from 'framer-motion';
import { Scan, Check, Users, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AIScannerSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#4DA2FF]/5 to-transparent" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4DA2FF]/30 bg-[#4DA2FF]/10 px-4 py-2 mb-6 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-[#4DA2FF]" />
            <span className="text-sm text-white/80">AI-Powered</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Snap. Split. Settle.
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            AI-Powered OCR. Snap a photo, and our Claude-driven engine splits
            the bill for your group in seconds.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="relative overflow-hidden border-white/10 bg-linear-to-br from-white/5 to-white/0 backdrop-blur-xl p-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4DA2FF]/20 rounded-full blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center">
                      <Scan className="h-6 w-6 text-[#4DA2FF]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Receipt Scanner</h3>
                      <p className="text-white/50 text-sm">Scanning receipt...</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                    Active
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="h-40 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center">
                    <div className="text-center">
                      <Scan className="h-12 w-12 text-[#4DA2FF] mx-auto mb-2 animate-pulse" />
                      <p className="text-white/60 text-sm">Receipt detected</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-white/80">OCR Processing Complete</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-white/80">Items Identified: 12</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-white/80">Total: $247.50</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#4DA2FF]/10 border border-[#4DA2FF]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-[#4DA2FF]" />
                    <span className="text-white text-sm font-medium">Auto-Split Between 4 People</span>
                  </div>
                  <p className="text-white/60 text-xs">Each person owes: $61.88</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ x: 40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center">
                  <span className="text-[#4DA2FF] font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Snap the Receipt</h4>
                  <p className="text-white/60 text-sm">
                    Take a photo of any receipt, directly in Telegram or the web app.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center">
                  <span className="text-[#4DA2FF] font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">AI Does the Math</h4>
                  <p className="text-white/60 text-sm">
                    Claude AI extracts items, prices, and splits them across your group instantly.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center">
                  <span className="text-[#4DA2FF] font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Settle on Sui</h4>
                  <p className="text-white/60 text-sm">
                    Pay in any token with one-tap settlement. No manual calculations needed.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
