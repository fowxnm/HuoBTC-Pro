/**
 * Reown AppKit (Web3Modal) — 初始化 & 导出 modal 实例
 *
 * 使用 WagmiAdapter，支持 MetaMask / WalletConnect / Coinbase 等钱包
 */
import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet } from "@reown/appkit/networks";

const projectId = "209cb9ddcf159a88a8c99d2ab9f0560a";

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mainnet],
});

const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  metadata: {
    name: "HuoBTC",
    description: "HuoBTC — Secure Digital Asset Exchange",
    url: "https://huobtc.com",
    icons: [],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#00f0ff",
  },
  features: {
    email: false,
    socials: false,
    onramp: false,
    swaps: false,
  },
  enableWalletGuide: false,
} as any);

export { modal, wagmiAdapter };
