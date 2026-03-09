"use client";

import { useState } from "react";
import { LiveDemo } from "@/components/LiveDemo";
import { CodeComparison } from "@/components/CodeComparison";

export default function Home() {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="min-h-screen grid-overlay">
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-6">
          <div className="badge-purple mb-6">RPC Method</div>
          <h1 className="text-4xl font-semibold tracking-tight mb-4"
            style={{ color: 'var(--text-primary)' }}>
            eth_sendRawTransactionSync
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className="text-lg">
            Send a transaction and get the receipt in one call. No polling.
          </p>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-3">
            Not a sequencer pre-confirmation. The receipt comes from proposed state, with real execution results.
          </p>
        </div>

        {/* Stripe divider */}
        <div className="stripe-divider my-10" />

        {/* How blocks work */}
        <div className="mb-10">
          <div className="badge-purple mb-4">How Monad blocks work</div>

          <div className="monad-card p-6 mb-3">
            <div className="relative z-10">
              {/* Pipeline */}
              <div className="flex items-center gap-4 text-sm font-mono mb-6">
                <span className="px-3 py-1.5 border" style={{
                  color: 'var(--accent-purple)',
                  borderColor: 'var(--accent-purple-dim)',
                  background: 'rgba(124, 108, 255, 0.05)'
                }}>
                  Proposed
                </span>
                <span style={{ color: 'var(--text-dim)' }}>→</span>
                <span className="px-3 py-1.5 border" style={{
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--border-medium)'
                }}>
                  Voted
                </span>
                <span style={{ color: 'var(--text-dim)' }}>→</span>
                <span className="px-3 py-1.5 border" style={{
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-subtle)'
                }}>
                  Finalized
                </span>
              </div>

              <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
                Each block moves through three stages, ~400ms apart.
                Since v0.13.0, the{" "}
                <code style={{ color: 'var(--text-secondary)' }}>latest</code>{" "}
                block tag returns data from{" "}
                <span style={{ color: 'var(--accent-purple)' }}>Proposed</span>{" "}
                blocks instead of Voted — so all RPC queries see new state ~400ms sooner.
              </p>

              {/* Method comparison */}
              <div className="space-y-3">
                <div className="flex gap-4 text-xs">
                  <span className="font-mono w-28 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    traditional
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Polls <code style={{ color: 'var(--text-muted)' }}>latest</code> for the receipt.
                    Now faster because <code style={{ color: 'var(--text-muted)' }}>latest</code> returns proposed blocks.
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="font-mono w-28 shrink-0" style={{ color: 'var(--accent-purple)' }}>
                    sync
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Waits server-side and returns the receipt in the same call.
                    Skips polling entirely — still fewer round-trips.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            Tradeoff: proposed blocks have a tiny reorg risk vs finalized. In practice, negligible.
          </p>
        </div>

        {/* Stripe divider */}
        <div className="stripe-divider my-10" />

        {/* Demo */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="badge-purple">Try it</div>
            <button
              onClick={() => setShowCode(!showCode)}
              className="text-xs font-mono transition-colors"
              style={{ color: showCode ? 'var(--accent-purple)' : 'var(--text-muted)' }}
            >
              {showCode ? "[ hide code ]" : "[ view code ]"}
            </button>
          </div>
          <div className="monad-card p-6">
            <LiveDemo />
          </div>
        </div>

        {/* Code */}
        {showCode && (
          <div className="mb-10">
            <CodeComparison />
          </div>
        )}

        {/* Stripe divider */}
        <div className="stripe-divider my-10" />

        {/* Why */}
        <div>
          <div className="badge-purple mb-8">Why</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "Simpler code", desc: "One call, no polling loop or retry logic" },
              { title: "Atomic confirmation", desc: "Know tx succeeded before your function returns" },
              { title: "Fewer RPC calls", desc: "1 call vs 3-10+, less rate limiting risk" },
              { title: "Real execution", desc: "Not a sequencer promise, actual execution result" },
            ].map((item) => (
              <div key={item.title} className="monad-card p-5">
                <div className="relative z-10">
                  <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer spacer */}
        <div className="h-16" />
      </div>
    </div>
  );
}
