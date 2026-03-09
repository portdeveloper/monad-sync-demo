# eth_sendRawTransactionSync Demo

Interactive demo comparing Monad's `eth_sendRawTransactionSync` (single call, receipt returned directly) against the traditional `sendRawTransaction` + `waitForTransactionReceipt` polling pattern.

**Live:** [monad-sync-demo.vercel.app](https://monad-sync-demo.vercel.app)

## What it does

1. Generates a temporary wallet (private key stored in localStorage)
2. Sends 0-value self-transfers on Monad mainnet
3. Times pure network latency for both methods (tx prep/signing excluded)
4. Supports single runs, side-by-side comparison, and 10x benchmarks

## v0.13.0 context

Since Monad v0.13.0, the `latest` block tag returns **Proposed** blocks instead of **Voted**, making traditional polling ~400ms faster. The sync method still wins on simplicity (1 call, no polling logic) and fewer RPC round-trips.

The demo includes an explainer on the Proposed → Voted → Finalized block pipeline.

## Setup

```bash
npm install
npm run dev
```

Runs at [localhost:3000](http://localhost:3000). Requires a small amount of MON in the generated wallet to send transactions.

## Stack

Next.js 16, React 19, viem, Tailwind v4
