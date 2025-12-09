"use client";

import { useState } from "react";
import { LiveDemo } from "@/components/LiveDemo";
import { CodeComparison } from "@/components/CodeComparison";

export default function Home() {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-3xl font-medium tracking-tight text-white">
              eth_sendRawTransactionSync
            </h1>
            <span className="text-xs text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded">
              Monad Mainnet
            </span>
          </div>
          <p className="text-zinc-500 text-base">
            Send a transaction and get the receipt in one call. No polling.
          </p>
          <p className="text-zinc-600 text-sm mt-3">
            Not pre-confirmation from a sequencer. Actual tx finality, fetched from voted state.
          </p>
        </div>

        {/* Stats - cubist offset boxes */}
        <div className="flex gap-12 mb-10 text-sm">
          <div className="relative">
            <div className="absolute -left-2 -top-2 w-full h-full border border-zinc-800" />
            <div className="relative bg-[#09090b] px-4 py-3 border border-zinc-700">
              <div className="text-white font-mono">~700ms</div>
              <div className="text-zinc-600 text-xs mt-0.5">end-to-end</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-2 -top-2 w-full h-full border border-zinc-800" />
            <div className="relative bg-[#09090b] px-4 py-3 border border-zinc-700">
              <div className="text-white font-mono">1 call</div>
              <div className="text-zinc-600 text-xs mt-0.5">vs 3-10+ traditional</div>
            </div>
          </div>
        </div>

        {/* Demo */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">Try it</span>
            <button
              onClick={() => setShowCode(!showCode)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showCode ? "hide code" : "view code"}
            </button>
          </div>
          <LiveDemo />
        </div>

        {/* Code */}
        {showCode && (
          <div className="mb-8">
            <CodeComparison />
          </div>
        )}

        {/* Why */}
        <div className="pt-8 border-t border-zinc-900">
          <span className="text-xs text-zinc-600 uppercase tracking-wider">Why</span>
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <div className="text-zinc-400">Simpler code</div>
              <div className="text-zinc-600 text-xs mt-1">One call, no polling loop or retry logic</div>
            </div>
            <div>
              <div className="text-zinc-400">Atomic confirmation</div>
              <div className="text-zinc-600 text-xs mt-1">Know tx succeeded before your function returns</div>
            </div>
            <div>
              <div className="text-zinc-400">Fewer RPC calls</div>
              <div className="text-zinc-600 text-xs mt-1">1 call vs 3-10+, less rate limiting risk</div>
            </div>
            <div>
              <div className="text-zinc-400">Real finality</div>
              <div className="text-zinc-600 text-xs mt-1">Not a sequencer promise, actual voted state</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
