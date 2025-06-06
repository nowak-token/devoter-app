import { getDefaultConfig } from 'rainbowkit';
import { base } from 'viem/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: 'YOUR_PROJECT_ID', // Replace with your actual project ID
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
