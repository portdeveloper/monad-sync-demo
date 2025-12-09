import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { monad } from "viem/chains";

export const config = getDefaultConfig({
  appName: "Monad Sync Demo",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Get one at https://cloud.walletconnect.com
  chains: [monad],
  transports: {
    [monad.id]: http("https://rpc.monad.xyz"),
  },
  ssr: true,
});
