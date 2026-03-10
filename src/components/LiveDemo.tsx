"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createWalletClient, createPublicClient, http, formatEther, type WalletClient, type PublicClient } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const RPC_URL = "https://rpc-testnet.monadinfra.com";

function parseError(err: Error): string {
  const msg = err.message || String(err);
  if (msg.includes("Insufficient funds") || msg.includes("exceeds the balance")) {
    return "Insufficient funds. Send MON to this wallet to run the demo.";
  }
  return msg;
}

type DemoResult = {
  walletTime: number;
  networkTime: number;
  totalTime: number;
  txHash?: string;
};

type BenchmarkResult = {
  times: number[];
  avg: number;
  min: number;
  max: number;
};

const STORAGE_KEY = "monad-demo-pk";

export function LiveDemo() {
  const [privateKey, setPrivateKey] = useState("");
  const [isValidKey, setIsValidKey] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setPrivateKey(saved);
  }, []);

  useEffect(() => {
    if (privateKey) {
      localStorage.setItem(STORAGE_KEY, privateKey);
    }
  }, [privateKey]);

  const { account, walletClient, publicClient } = useMemo(() => {
    if (!privateKey || !privateKey.startsWith("0x") || privateKey.length !== 66) {
      return { account: null, walletClient: null, publicClient: null };
    }
    try {
      const acc = privateKeyToAccount(privateKey as `0x${string}`);
      const wallet = createWalletClient({
        account: acc,
        chain: monadTestnet,
        transport: http(RPC_URL),
      });
      const pub = createPublicClient({
        chain: monadTestnet,
        transport: http(RPC_URL),
      });
      setIsValidKey(true);
      return { account: acc, walletClient: wallet as WalletClient, publicClient: pub as PublicClient };
    } catch {
      setIsValidKey(false);
      return { account: null, walletClient: null, publicClient: null };
    }
  }, [privateKey]);

  const address = account?.address;
  const isConnected = isValidKey && !!account;

  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient || !address) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      const bal = await publicClient.getBalance({ address });
      setBalance(formatEther(bal));
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [publicClient, address]);

  const [isRunning, setIsRunning] = useState(false);
  const [runningMethod, setRunningMethod] = useState<"traditional" | "sync" | null>(null);
  const [traditionalResult, setTraditionalResult] = useState<DemoResult | null>(null);
  const [syncResult, setSyncResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkProgress, setBenchmarkProgress] = useState<string | null>(null);
  const [traditionalBenchmark, setTraditionalBenchmark] = useState<BenchmarkResult | null>(null);
  const [syncBenchmark, setSyncBenchmark] = useState<BenchmarkResult | null>(null);

  const runTraditionalDemo = useCallback(async (): Promise<DemoResult> => {
    if (!walletClient || !publicClient || !address || !account) throw new Error("Not connected");

    const request = await walletClient.prepareTransactionRequest({
      account,
      chain: monadTestnet,
      to: address,
      value: 0n,
    });
    const serialized = await walletClient.signTransaction(request);

    const start = performance.now();
    const hash = await walletClient.sendRawTransaction({ serializedTransaction: serialized });

    // Poll eth_getTransactionReceipt directly
    while (true) {
      const receipt = await publicClient.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      });
      if (receipt) break;
    }
    const networkTime = performance.now() - start;

    return {
      walletTime: 0,
      networkTime,
      totalTime: networkTime,
      txHash: hash,
    };
  }, [walletClient, publicClient, address, account]);

  const runSyncDemo = useCallback(async (): Promise<DemoResult> => {
    if (!walletClient || !address || !account) throw new Error("Not connected");

    const request = await walletClient.prepareTransactionRequest({
      account,
      chain: monadTestnet,
      to: address,
      value: 0n,
    });
    const serialized = await walletClient.signTransaction(request);

    const start = performance.now();
    const receipt = await walletClient.sendRawTransactionSync({ serializedTransaction: serialized });
    const networkTime = performance.now() - start;

    return {
      walletTime: 0,
      networkTime,
      totalTime: networkTime,
      txHash: receipt?.transactionHash,
    };
  }, [walletClient, address, account]);

  const runDemo = useCallback(async (method: "traditional" | "sync") => {
    if (!isConnected) return;

    setIsRunning(true);
    setRunningMethod(method);
    setError(null);

    if (method === "traditional") {
      setTraditionalResult(null);
    } else {
      setSyncResult(null);
    }

    try {
      if (method === "traditional") {
        const result = await runTraditionalDemo();
        setTraditionalResult(result);
      } else {
        const result = await runSyncDemo();
        setSyncResult(result);
      }
    } catch (err) {
      setError(parseError(err as Error));
    } finally {
      setIsRunning(false);
      setRunningMethod(null);
    }
  }, [isConnected, runTraditionalDemo, runSyncDemo]);

  const runBoth = useCallback(async () => {
    if (!isConnected) return;

    setIsRunning(true);
    setError(null);
    setTraditionalResult(null);
    setSyncResult(null);

    try {
      setRunningMethod("traditional");
      const tradResult = await runTraditionalDemo();
      setTraditionalResult(tradResult);

      setRunningMethod("sync");
      const syncResultData = await runSyncDemo();
      setSyncResult(syncResultData);
    } catch (err) {
      setError(parseError(err as Error));
    } finally {
      setIsRunning(false);
      setRunningMethod(null);
    }
  }, [isConnected, runTraditionalDemo, runSyncDemo]);

  const runBenchmark = useCallback(async () => {
    if (!isConnected) return;

    const ITERATIONS = 10;
    setIsRunning(true);
    setError(null);
    setTraditionalResult(null);
    setSyncResult(null);
    setTraditionalBenchmark(null);
    setSyncBenchmark(null);

    try {
      const traditionalTimes: number[] = [];
      setRunningMethod("traditional");
      for (let i = 0; i < ITERATIONS; i++) {
        setBenchmarkProgress(`traditional ${i + 1}/${ITERATIONS}`);
        const result = await runTraditionalDemo();
        traditionalTimes.push(result.networkTime);
      }

      const tradSorted = [...traditionalTimes].sort((a, b) => a - b);
      setTraditionalBenchmark({
        times: traditionalTimes,
        avg: traditionalTimes.reduce((a, b) => a + b, 0) / traditionalTimes.length,
        min: tradSorted[0],
        max: tradSorted[tradSorted.length - 1],
      });

      const syncTimes: number[] = [];
      setRunningMethod("sync");
      for (let i = 0; i < ITERATIONS; i++) {
        setBenchmarkProgress(`sync ${i + 1}/${ITERATIONS}`);
        const result = await runSyncDemo();
        syncTimes.push(result.networkTime);
      }

      const syncSorted = [...syncTimes].sort((a, b) => a - b);
      setSyncBenchmark({
        times: syncTimes,
        avg: syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length,
        min: syncSorted[0],
        max: syncSorted[syncSorted.length - 1],
      });

    } catch (err) {
      setError(parseError(err as Error));
    } finally {
      setIsRunning(false);
      setRunningMethod(null);
      setBenchmarkProgress(null);
    }
  }, [isConnected, runTraditionalDemo, runSyncDemo]);

  const ResultCard = ({ result, label, isActive }: { result: DemoResult | null; label: string; isActive: boolean }) => {
    const isSyncLabel = label === "sync";
    return (
      <div
        className="monad-card p-5"
        style={isActive ? { borderColor: 'var(--accent-purple-dim)' } : {}}
      >
        <div className="relative z-10">
          <div className="text-xs font-mono mb-3" style={{
            color: isSyncLabel ? 'var(--accent-purple)' : 'var(--text-muted)'
          }}>
            {label}
          </div>
          {isActive ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-1.5 h-1.5 monad-pulse" style={{ background: 'var(--accent-purple)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>sending...</span>
            </div>
          ) : result ? (
            <>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>
                    {label === "traditional" ? "send + poll" : "sendSync"}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {(result.networkTime / 1000).toFixed(3)}s
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>network time</span>
                <span className="font-mono text-base" style={{
                  color: isSyncLabel ? 'var(--accent-purple)' : 'var(--text-primary)'
                }}>
                  {(result.totalTime / 1000).toFixed(3)}s
                </span>
              </div>
              {result.txHash && (
                <a
                  href={`https://testnet.monadexplorer.com/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs mt-3 block font-mono transition-colors"
                  style={{ color: 'var(--text-dim)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-purple)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                >
                  view tx →
                </a>
              )}
            </>
          ) : (
            <div className="text-xs py-4" style={{ color: 'var(--text-dim)' }}>—</div>
          )}
        </div>
      </div>
    );
  };

  const canCompare = traditionalResult && syncResult;
  const traditionalNetworkTime = traditionalResult?.networkTime || 0;
  const syncNetworkTime = syncResult?.networkTime || 0;

  return (
    <div className="space-y-6">
      {/* Wallet */}
      <div className="space-y-4">
        {!isConnected ? (
          <button
            onClick={() => setPrivateKey(generatePrivateKey())}
            className="h-10 px-5 text-sm font-mono border transition-colors cursor-pointer"
            style={{
              borderColor: 'var(--accent-purple-dim)',
              color: 'var(--accent-purple)',
              background: 'rgba(124, 108, 255, 0.05)'
            }}
          >
            generate wallet
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>address</span>
              <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{address}</code>
              <button
                onClick={() => navigator.clipboard.writeText(address!)}
                className="text-xs font-mono transition-colors cursor-pointer"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-purple)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >
                copy
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>balance</span>
              <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {balance ?? "..."} MON
              </code>
            </div>
            {balance && parseFloat(balance) < 0.01 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Send ~0.1 MON to run the demo. Temporary testing wallet — do not send more than you need.
              </p>
            )}
            <button
              onClick={() => navigator.clipboard.writeText(privateKey)}
              className="text-xs font-mono transition-colors cursor-pointer"
              style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-purple)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
            >
              [ copy private key ]
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => runDemo("traditional")}
            disabled={isRunning || !isConnected}
            className="h-8 px-3 text-xs font-mono rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
            style={{ background: 'var(--border-medium)', color: 'var(--text-secondary)' }}
          >
            traditional
          </button>
          <button
            onClick={() => runDemo("sync")}
            disabled={isRunning || !isConnected}
            className="h-8 px-3 text-xs font-mono rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
            style={{ background: 'var(--border-medium)', color: 'var(--text-secondary)' }}
          >
            sync
          </button>
          <button
            onClick={runBoth}
            disabled={isRunning || !isConnected}
            className="h-8 px-3 text-xs font-mono rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
            style={{
              background: 'var(--accent-purple)',
              color: '#fff',
            }}
          >
            {isRunning && !benchmarkProgress ? "running..." : "compare both"}
          </button>
          <button
            onClick={runBenchmark}
            disabled={isRunning || !isConnected}
            className="h-8 px-3 text-xs font-mono rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
            style={{ background: 'var(--border-medium)', color: 'var(--text-muted)' }}
          >
            {benchmarkProgress || "benchmark 10x"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono" style={{ color: '#ff6b6b' }}>{error}</p>
      )}

      {/* Results */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-4">
          <ResultCard
            result={traditionalResult}
            label="traditional"
            isActive={runningMethod === "traditional"}
          />
          <ResultCard
            result={syncResult}
            label="sync"
            isActive={runningMethod === "sync"}
          />
        </div>
      )}

      {/* Comparison */}
      {canCompare && traditionalNetworkTime > 0 && syncNetworkTime > 0 && (
        <div className="monad-card p-5">
          <div className="relative z-10">
            <div className="text-xs font-mono mb-4" style={{ color: 'var(--text-muted)' }}>comparison</div>
            <div className="flex gap-8 text-sm">
              <div>
                <span className="font-mono" style={{ color: 'var(--text-dim)' }}>traditional: </span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {(traditionalNetworkTime / 1000).toFixed(3)}s
                </span>
              </div>
              <div>
                <span className="font-mono" style={{ color: 'var(--text-dim)' }}>sync: </span>
                <span className="font-mono" style={{ color: 'var(--accent-purple)' }}>
                  {(syncNetworkTime / 1000).toFixed(3)}s
                </span>
              </div>
            </div>
            {traditionalNetworkTime > syncNetworkTime && (
              <div className="flex gap-6 text-sm mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <span className="font-mono" style={{ color: 'var(--text-dim)' }}>saved </span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {((traditionalNetworkTime - syncNetworkTime) / 1000).toFixed(3)}s
                  </span>
                </div>
                <div>
                  <span className="font-mono" style={{ color: 'var(--text-dim)' }}>speedup </span>
                  <span className="font-mono" style={{ color: 'var(--accent-purple)' }}>
                    {(traditionalNetworkTime / syncNetworkTime).toFixed(2)}x
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Benchmark Results */}
      {traditionalBenchmark && syncBenchmark && (
        <div className="monad-card p-5">
          <div className="relative z-10">
            <div className="text-xs font-mono mb-5" style={{ color: 'var(--text-muted)' }}>
              benchmark (10 iterations each)
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>traditional</div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>avg</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{(traditionalBenchmark.avg / 1000).toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>min</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(traditionalBenchmark.min / 1000).toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>max</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(traditionalBenchmark.max / 1000).toFixed(3)}s</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-mono mb-3" style={{ color: 'var(--accent-purple)' }}>sync</div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>avg</span>
                    <span style={{ color: 'var(--accent-purple)' }}>{(syncBenchmark.avg / 1000).toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>min</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(syncBenchmark.min / 1000).toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>max</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(syncBenchmark.max / 1000).toFixed(3)}s</span>
                  </div>
                </div>
              </div>
            </div>

            {traditionalBenchmark.avg > syncBenchmark.avg && (
              <div className="flex gap-6 text-sm mt-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <span className="font-mono" style={{ color: 'var(--text-dim)' }}>avg saved </span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {((traditionalBenchmark.avg - syncBenchmark.avg) / 1000).toFixed(3)}s
                  </span>
                </div>
                <div>
                  <span className="font-mono" style={{ color: 'var(--text-dim)' }}>avg speedup </span>
                  <span className="font-mono" style={{ color: 'var(--accent-purple)' }}>
                    {(traditionalBenchmark.avg / syncBenchmark.avg).toFixed(2)}x
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
          timing excludes tx preparation/signing. measures pure network latency only.
        </p>
        <p className="text-xs font-mono" style={{ color: '#8b7530' }}>
          This demo runs on Monad testnet. Transactions use testnet MON.
        </p>
      </div>
    </div>
  );
}
