"use client";

const traditionalCode = `const hash = await walletClient.sendRawTransaction({
  serializedTransaction,
});

// poll for receipt
const receipt = await publicClient.waitForTransactionReceipt({
  hash,
});`;

const syncCode = `// single call - receipt returned directly
const receipt = await walletClient.sendRawTransactionSync({
  serializedTransaction,
});`;

export function CodeComparison() {
  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="absolute -left-3 -top-3 w-full h-full border border-zinc-800" />
        <div className="relative bg-[#09090b] border border-zinc-800 p-4">
          <div className="text-xs text-zinc-600 mb-3">traditional</div>
          <pre className="text-xs text-zinc-400 font-mono leading-relaxed overflow-x-auto">
            {traditionalCode}
          </pre>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -left-3 -top-3 w-full h-full border border-zinc-700" />
        <div className="relative bg-[#09090b] border border-zinc-700 p-4">
          <div className="text-xs text-zinc-500 mb-3">sync</div>
          <pre className="text-xs text-zinc-300 font-mono leading-relaxed overflow-x-auto">
            {syncCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
