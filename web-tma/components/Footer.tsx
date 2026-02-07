'use client';

import { Github, Send, Twitter, Layers } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#121212]/50 backdrop-blur-xl py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-6 w-6 text-[#4DA2FF]" />
              <span className="text-xl font-bold text-white">LayerSplit</span>
            </div>
            <p className="text-white/60 text-sm">
              The social settlement layer on Sui where late payers pay the Vibe Tax.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#features"
                  className="text-white/60 hover:text-[#4DA2FF] transition-colors text-sm"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="text-white/60 hover:text-[#4DA2FF] transition-colors text-sm"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-white/60 hover:text-[#4DA2FF] transition-colors text-sm"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#docs"
                  className="text-white/60 hover:text-[#4DA2FF] transition-colors text-sm"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#api"
                  className="text-white/60 hover:text-[#4DA2FF] transition-colors text-sm"
                >
                  API Reference
                </Link>
              </li>
              <li>
                <Link
                  href="#support"
                  className="text-white/60 hover:text-[#4DA2FF] transition-colors text-sm"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <div className="flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-[#4DA2FF]/20 border border-white/20 hover:border-[#4DA2FF]/50 flex items-center justify-center transition-all group"
              >
                <Github className="h-5 w-5 text-white/70 group-hover:text-[#4DA2FF] transition-colors" />
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-[#4DA2FF]/20 border border-white/20 hover:border-[#4DA2FF]/50 flex items-center justify-center transition-all group"
              >
                <Send className="h-5 w-5 text-white/70 group-hover:text-[#4DA2FF] transition-colors" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-[#4DA2FF]/20 border border-white/20 hover:border-[#4DA2FF]/50 flex items-center justify-center transition-all group"
              >
                <Twitter className="h-5 w-5 text-white/70 group-hover:text-[#4DA2FF] transition-colors" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/50 text-sm">
              © {currentYear} LayerSplit. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="#privacy"
                className="text-white/50 hover:text-[#4DA2FF] transition-colors text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="#terms"
                className="text-white/50 hover:text-[#4DA2FF] transition-colors text-sm"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
