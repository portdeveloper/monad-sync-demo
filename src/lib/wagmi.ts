import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { monadTestnet } from "viem/chains";

export const config = getDefaultConfig({
  appName: "Monad Sync Demo",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Get one at https://cloud.walletconnect.com
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
  ssr: true,
});
