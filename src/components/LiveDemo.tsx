"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createWalletClient, createPublicClient, http, formatEther, type WalletClient, type PublicClient } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { monad } from "viem/chains";

const RPC_URL = "https://rpc-mainnet.monadinfra.com";

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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setPrivateKey(saved);
  }, []);

  // Save to localStorage when privateKey changes
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
        chain: monad,
        transport: http(RPC_URL),
      });
      const pub = createPublicClient({
        chain: monad,
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

  // Fetch balance when connected
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

    // Prepare and sign transaction first (not timed)
    const request = await walletClient.prepareTransactionRequest({
      account,
      chain: monad,
      to: address,
      value: 0n,
    });
    const serialized = await walletClient.signTransaction(request);

    // Only time the network portion
    const start = performance.now();
    const hash = await walletClient.sendRawTransaction({ serializedTransaction: serialized });
    await publicClient.waitForTransactionReceipt({ hash });
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

    // Prepare and sign transaction first (not timed)
    const request = await walletClient.prepareTransactionRequest({
      account,
      chain: monad,
      to: address,
      value: 0n,
    });
    const serialized = await walletClient.signTransaction(request);

    // Only time the network portion
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
      // Run traditional 10x
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

      // Run sync 10x
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

  const ResultCard = ({ result, label, isActive }: { result: DemoResult | null; label: string; isActive: boolean }) => (
    <div className={`border p-4 ${isActive ? "border-zinc-700" : "border-zinc-900"}`}>
      <div className="text-xs text-zinc-600 mb-3">{label}</div>
      {isActive ? (
        <div className="flex items-center gap-2 py-4">
          <div className="w-1.5 h-1.5 bg-zinc-500 animate-pulse" />
          <span className="text-xs text-zinc-500">sending...</span>
        </div>
      ) : result ? (
        <>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-600">{label === "traditional" ? "send + poll" : "sendSync"}</span>
              <span className="text-zinc-400 font-mono">{(result.networkTime / 1000).toFixed(3)}s</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
            <span className="text-sm text-zinc-500">network time</span>
            <span className="font-mono text-white">{(result.totalTime / 1000).toFixed(3)}s</span>
          </div>
          {result.txHash && (
            <a
              href={`https://explorer.monad.xyz/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 block"
            >
              view tx →
            </a>
          )}
        </>
      ) : (
        <div className="text-xs text-zinc-700 py-4">—</div>
      )}
    </div>
  );

  // For comparison, use network time from traditional vs total from sync
  // (since sync's "network" time is instant - receipt comes with the response)
  const canCompare = traditionalResult && syncResult;
  const traditionalNetworkTime = traditionalResult?.networkTime || 0;
  const syncNetworkTime = syncResult?.networkTime || 0;

  return (
    <div className="space-y-6">
      {/* Wallet */}
      <div className="space-y-3">
        {!isConnected ? (
          <button
            onClick={() => setPrivateKey(generatePrivateKey())}
            className="h-9 px-4 text-sm border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-200 transition-colors"
          >
            generate wallet
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600">address:</span>
              <code className="text-xs text-zinc-400 font-mono">{address}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600">balance:</span>
              <code className="text-xs text-zinc-400 font-mono">{balance ?? "..."} MON</code>
            </div>
            {balance && parseFloat(balance) < 0.01 && (
              <p className="text-xs text-zinc-500">
                Send ~0.1 MON to run the demo. This is a temporary testing wallet, do not send more than you need.
              </p>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(privateKey);
              }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              copy private key
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => runDemo("traditional")}
            disabled={isRunning || !isConnected}
            className="h-9 px-4 text-sm border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            traditional
          </button>
          <button
            onClick={() => runDemo("sync")}
            disabled={isRunning || !isConnected}
            className="h-9 px-4 text-sm border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            sync
          </button>
          <button
            onClick={runBoth}
            disabled={isRunning || !isConnected}
            className="h-9 px-4 text-sm bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning && !benchmarkProgress ? "running..." : "compare both"}
          </button>
          <button
            onClick={runBenchmark}
            disabled={isRunning || !isConnected}
            className="h-9 px-4 text-sm border border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {benchmarkProgress || "benchmark 10x"}
          </button>
        </div>
      </div>

      
      {error && (
        <p className="text-xs text-red-400">{error}</p>
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
        <div className="border border-zinc-800 p-4">
          <div className="text-xs text-zinc-600 mb-3">comparison</div>
          <div className="flex gap-8 text-sm">
            <div>
              <span className="text-zinc-600">traditional: </span>
              <span className="text-zinc-400 font-mono">{(traditionalNetworkTime / 1000).toFixed(3)}s</span>
            </div>
            <div>
              <span className="text-zinc-600">sync: </span>
              <span className="text-white font-mono">{(syncNetworkTime / 1000).toFixed(3)}s</span>
            </div>
          </div>
          {traditionalNetworkTime > syncNetworkTime && (
            <div className="flex gap-6 text-sm mt-3 pt-3 border-t border-zinc-900">
              <div>
                <span className="text-zinc-600">saved </span>
                <span className="text-white font-mono">{((traditionalNetworkTime - syncNetworkTime) / 1000).toFixed(3)}s</span>
              </div>
              <div>
                <span className="text-zinc-600">speedup </span>
                <span className="text-white font-mono">{(traditionalNetworkTime / syncNetworkTime).toFixed(2)}x</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Benchmark Results */}
      {traditionalBenchmark && syncBenchmark && (
        <div className="border border-zinc-800 p-4">
          <div className="text-xs text-zinc-600 mb-4">benchmark (10 iterations each)</div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-zinc-500 text-xs mb-2">traditional</div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">avg</span>
                  <span className="text-zinc-400">{(traditionalBenchmark.avg / 1000).toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">min</span>
                  <span className="text-zinc-500">{(traditionalBenchmark.min / 1000).toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">max</span>
                  <span className="text-zinc-500">{(traditionalBenchmark.max / 1000).toFixed(3)}s</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-zinc-500 text-xs mb-2">sync</div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">avg</span>
                  <span className="text-white">{(syncBenchmark.avg / 1000).toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">min</span>
                  <span className="text-zinc-500">{(syncBenchmark.min / 1000).toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">max</span>
                  <span className="text-zinc-500">{(syncBenchmark.max / 1000).toFixed(3)}s</span>
                </div>
              </div>
            </div>
          </div>

          {traditionalBenchmark.avg > syncBenchmark.avg && (
            <div className="flex gap-6 text-sm mt-4 pt-3 border-t border-zinc-900">
              <div>
                <span className="text-zinc-600">avg saved </span>
                <span className="text-white font-mono">{((traditionalBenchmark.avg - syncBenchmark.avg) / 1000).toFixed(3)}s</span>
              </div>
              <div>
                <span className="text-zinc-600">avg speedup </span>
                <span className="text-white font-mono">{(traditionalBenchmark.avg / syncBenchmark.avg).toFixed(2)}x</span>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-700">
        timing excludes tx preparation/signing. measures pure network latency only.
      </p>
      <p className="text-xs text-yellow-600/80">
        This demo runs on Monad mainnet. Transactions use real MON.
      </p>
    </div>
  );
}
