'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function YieldEngineSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#121212]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#4DA2FF15_0%,transparent_70%)]" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4DA2FF]/30 bg-[#4DA2FF]/10 px-4 py-2 mb-6 backdrop-blur-sm">
            <TrendingUp className="h-4 w-4 text-[#4DA2FF]" />
            <span className="text-sm text-white/80">The Vibe Tax</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Get Paid Back
            <br />
            <span className="bg-linear-to-r from-[#4DA2FF] to-[#6BB5FF] bg-clip-text text-transparent">
              With Interest
            </span>
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Late payers learn quickly. After a 3-day grace period, debt grows with our
            yield engine. Alice gets paid back with interest. Bob learns to pay on time.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-white/10 bg-linear-to-br from-white/5 to-white/0 backdrop-blur-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Outstanding Balance</p>
                  <h3 className="text-3xl font-bold text-white">$61.88</h3>
                </div>
                <div className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                  Day 5
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">Grace Period</span>
                    <span className="text-white">Expired</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4DA2FF] transition-all" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-xs text-white/40 mt-1">3 days elapsed</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">Vibe Tax Growth</span>
                    <span className="text-[#4DA2FF]">+3.2%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4DA2FF] transition-all" style={{ width: '32%' }}></div>
                  </div>
                  <p className="text-xs text-white/40 mt-1">$1.98 interest accrued</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#4DA2FF]/10 border border-[#4DA2FF]/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#4DA2FF]" />
                  <span className="text-white text-sm font-medium">New Total: $63.86</span>
                </div>
                <p className="text-white/60 text-xs mt-1">Interest compounds daily</p>
              </div>
            </Card>

            <Card className="border-green-500/20 bg-linear-to-br from-green-500/5 to-green-500/0 backdrop-blur-xl p-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Alice Gets Rewarded</h4>
                  <p className="text-white/60 text-sm">
                    The interest goes directly to Alice for fronting the money. Fair compensation
                    for covering the group expense.
                  </p>
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
            <div className="p-6 rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-[#4DA2FF]/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-[#4DA2FF]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">How It Works</h3>
                  <p className="text-white/50 text-sm">The Vibe Tax Timeline</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <span className="text-green-400 text-xs font-bold">0</span>
                    </div>
                    <div className="w-px h-12 bg-white/10" />
                  </div>
                  <div className="pt-1">
                    <h4 className="text-white font-medium mb-1">Day 0-3: Grace Period</h4>
                    <p className="text-white/60 text-sm">
                      No interest. Friendly reminder that payment is due.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <span className="text-yellow-400 text-xs font-bold">3</span>
                    </div>
                    <div className="w-px h-12 bg-white/10" />
                  </div>
                  <div className="pt-1">
                    <h4 className="text-white font-medium mb-1">Day 4+: Vibe Tax Kicks In</h4>
                    <p className="text-white/60 text-sm">
                      Interest starts accruing at 1% per day. Social pressure engaged.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <span className="text-red-400 text-xs font-bold">7</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <h4 className="text-white font-medium mb-1">Day 7+: Maximum Vibe Tax</h4>
                    <p className="text-white/60 text-sm">
                      Interest rate increases. Time to settle up and restore the vibes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
