'use client';

import { motion } from 'framer-motion';
import { Zap, Shield, Rocket, Layers } from 'lucide-react';

export function CetusSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-t from-[#4DA2FF]/5 via-transparent to-transparent" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4DA2FF]/30 bg-[#4DA2FF]/10 px-4 py-2 mb-6 backdrop-blur-sm">
            <Layers className="h-4 w-4 text-[#4DA2FF]" />
            <span className="text-sm text-white/80">Powered By</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Built on the Best
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Atomic settlement powered by Cetus Aggregator for the best rates across Sui DeFi
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 backdrop-blur-xl text-center group hover:border-[#4DA2FF]/30 transition-all duration-300"
          >
            <div className="h-16 w-16 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-8 w-8 text-[#4DA2FF]" />
            </div>
            <h3 className="text-white font-semibold mb-2 text-lg">Instant Settlement</h3>
            <p className="text-white/60 text-sm">
              Atomic swaps ensure everyone gets paid in their preferred token
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 backdrop-blur-xl text-center group hover:border-[#4DA2FF]/30 transition-all duration-300"
          >
            <div className="h-16 w-16 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-8 w-8 text-[#4DA2FF]" />
            </div>
            <h3 className="text-white font-semibold mb-2 text-lg">Secure by Design</h3>
            <p className="text-white/60 text-sm">
              Built on Sui's secure Move language for guaranteed safety
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-6 rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 backdrop-blur-xl text-center group hover:border-[#4DA2FF]/30 transition-all duration-300"
          >
            <div className="h-16 w-16 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Rocket className="h-8 w-8 text-[#4DA2FF]" />
            </div>
            <h3 className="text-white font-semibold mb-2 text-lg">Lightning Fast</h3>
            <p className="text-white/60 text-sm">
              Sub-second finality means no waiting around for settlements
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 backdrop-blur-xl text-center group hover:border-[#4DA2FF]/30 transition-all duration-300"
          >
            <div className="h-16 w-16 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Layers className="h-8 w-8 text-[#4DA2FF]" />
            </div>
            <h3 className="text-white font-semibold mb-2 text-lg">Best Rates</h3>
            <p className="text-white/60 text-sm">
              Cetus Aggregator finds optimal routes across all Sui DEXs
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 p-8 rounded-2xl border border-[#4DA2FF]/20 bg-linear-to-br from-[#4DA2FF]/10 to-[#4DA2FF]/5 backdrop-blur-xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Powered by Cetus</h3>
              <p className="text-white/70">
                The leading DEX aggregator on Sui, ensuring you always get the best swap rates
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                <span className="text-white font-mono font-semibold">Sui Network</span>
              </div>
              <div className="px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                <span className="text-white font-mono font-semibold">Cetus DEX</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
