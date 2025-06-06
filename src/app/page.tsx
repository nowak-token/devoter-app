'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { SiweMessage } from 'siwe';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Added Image import

export default function Home() {
  const { data: session, status } = useSession();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    const handleSignIn = async () => {
      if (isConnected && status === 'unauthenticated' && address && chainId && !isSigningIn) {
        setIsSigningIn(true);
        setSignInError(null); // Clear previous errors
        try {
          // 1. Fetch nonce
          let nonce;
          try {
            const nonceRes = await fetch('/api/auth/nonce');
            if (!nonceRes.ok) {
              const errorBody = await nonceRes.json().catch(() => ({ message: nonceRes.statusText }));
              throw new Error(errorBody.message || `Failed to fetch nonce: ${nonceRes.status}`);
            }
            const nonceData = await nonceRes.json();
            nonce = nonceData.nonce;
            if (!nonce) {
              throw new Error('Nonce was not returned from API.');
            }
          } catch (fetchNonceError: any) {
            console.error("Nonce fetch error:", fetchNonceError);
            setSignInError(`Could not retrieve authentication challenge (nonce): ${fetchNonceError.message}. Please try again.`);
            setIsSigningIn(false);
            return;
          }

          // 2. Create SIWE message
          const message = new SiweMessage({
            domain: window.location.host,
            address,
            statement: 'Sign in with Ethereum to the app.',
            uri: window.location.origin,
            version: '1',
            chainId,
            nonce,
          });

          const signature = await signMessageAsync({
            message: message.prepareMessage(),
          });
        } catch (signError: any) {
          // Handles user rejecting signature or other signing errors
          console.error("SIWE message signing error:", signError);
          let errorMessage = "Signature request failed. Please try again.";
          if (signError.message && (signError.message.includes('rejected') || signError.message.includes('denied'))) {
            errorMessage = "Signature request rejected. To sign in, you need to approve the message in your wallet.";
          }
          setSignInError(errorMessage);
          setIsSigningIn(false);
          return; // Stop the process if signature fails
        }

          // 4. Sign in with NextAuth
        try {
          const signInRes = await signIn('credentials', {
            message: JSON.stringify(message), // message is already a SiweMessage object from above
            signature, // signature is from signMessageAsync
            redirect: false,
          });

          if (signInRes?.error) {
            console.error('SIWE NextAuth sign-in error:', signInRes.error);
            // Use the error message from the server if available
            setSignInError(signInRes.error || "Sign-in failed due to a server error. Please try again.");
          } else if (signInRes?.ok) {
            setSignInError(null); // Clear error on successful sign-in
            // router.push('/dashboard'); // Optional: redirect
          } else {
            // Should not happen if error is not set and not ok, but as a fallback
            setSignInError("An unknown error occurred during sign-in.");
          }
        } catch (nextAuthSignInError: any) {
            console.error("NextAuth signIn call error:", nextAuthSignInError);
            setSignInError("An unexpected error occurred while trying to sign in. Please check console.");
        } finally {
          setIsSigningIn(false); // Ensure this is always reset
        }

      } else if (!isConnected && status === 'authenticated' && !isSigningIn) {
        // If wallet disconnects AFTER session is authenticated AND not in midst of a sign-in attempt
        // (to avoid race condition if disconnect happens during SIWE)
        signOut({ redirect: false });
      }
    };

    handleSignIn();
  }, [isConnected, status, address, chainId, signMessageAsync, router, isSigningIn, disconnect]); // Added isSigningIn to dep array

  const handleSignOut = async () => {
    await signOut({ redirect: false }); // NextAuth sign out
    disconnect(); // Wagmi disconnect
    router.push('/');
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-end z-50">
        <ConnectButton />
      </header>

      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start text-center sm:text-left">
        <Image
          className="dark:invert mx-auto sm:mx-0"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div className="flex flex-col gap-4 items-center sm:items-start">
          <h1 className="text-3xl sm:text-4xl font-bold">Welcome to Our App</h1>
          <p className="text-sm/6 font-[family-name:var(--font-geist-mono)]">
            Connect your wallet to get started.
          </p>
        </div>

        {status === 'loading' && <p className="mt-4">Loading session...</p>}
        {isSigningIn && <p className="mt-4">Attempting SIWE sign in, please check your wallet...</p>}
        {signInError && <p className="mt-4 text-red-500">{signInError}</p>}

        {status === 'authenticated' && session?.user?.walletAddress && (
          <div className="mt-8 p-4 border rounded-lg shadow-md bg-gray-50 dark:bg-zinc-800/30">
            <p className="text-lg font-semibold">Signed in successfully!</p>
            <p>Wallet Address: <code className="font-mono font-bold">{session.user.walletAddress}</code></p>
            <p>User ID (from session): <code className="font-mono font-bold">{session.user.id}</code></p>
            <button
              onClick={handleSignOut}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
            >
              Sign Out & Disconnect Wallet
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 ml-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'unauthenticated' && !isConnected && (
           <p className="mt-4 text-gray-600 dark:text-gray-400">Please connect your wallet to sign in.</p>
        )}
         {status === 'unauthenticated' && isConnected && !isSigningIn && !signInError && (
           <p className="mt-4 text-yellow-600 dark:text-yellow-400">Wallet connected. Please sign the message to complete authentication.</p>
        )}

      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
