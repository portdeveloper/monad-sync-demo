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
    <div className="space-y-6">
      <div className="monad-card p-5">
        <div className="relative z-10">
          <div className="text-xs font-mono mb-4" style={{ color: 'var(--text-dim)' }}>
            traditional
          </div>
          <pre className="text-xs font-mono leading-relaxed overflow-x-auto" style={{ color: 'var(--text-muted)' }}>
            {traditionalCode}
          </pre>
        </div>
      </div>

      <div className="monad-card p-5" style={{ borderColor: 'var(--accent-purple-dim)' }}>
        <div className="relative z-10">
          <div className="text-xs font-mono mb-4" style={{ color: 'var(--accent-purple)' }}>
            sync
          </div>
          <pre className="text-xs font-mono leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
            {syncCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
