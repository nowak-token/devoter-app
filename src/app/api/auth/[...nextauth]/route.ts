import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials, req) {
        try {
          const siwe = new SiweMessage(JSON.parse(credentials?.message || "{}"));
          const storedNonce = cookies().get("siwe-nonce")?.value;

          if (!storedNonce) {
            console.error("Server-side nonce not found in cookie.");
            throw new Error("Authentication timed out or nonce is missing. Please try connecting again.");
          }

          // The nonce from the message (siwe.nonce) should match the storedNonce
          if (siwe.nonce !== storedNonce) {
            console.error(`Nonce mismatch: Message nonce: ${siwe.nonce}, Cookie nonce: ${storedNonce}`);
            throw new Error("Nonce mismatch. Please try again.");
          }

          const result = await siwe.verify({
            signature: credentials?.signature || "",
            // Nonce for verification is taken from the message itself,
            // after confirming it matches the server-stored nonce.
          });

          if (result.success) {
            cookies().delete("siwe-nonce"); // Clear the nonce cookie

            let user = await prisma.user.findUnique({
              where: { walletAddress: siwe.address },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  walletAddress: siwe.address,
                },
              });
            }
            return {
              id: user.id,
              walletAddress: user.walletAddress,
            };
          }
          return null;
        } catch (e) {
          console.error("Authorization error:", e);
          cookies().delete("siwe-nonce"); // Ensure cookie is cleared on error
          // Throw the error so NextAuth can pass it to the client
          if (e instanceof Error) {
            throw e; // Re-throw known errors
          }
          throw new Error("An unexpected error occurred during authentication."); // Generic error for unknown issues
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // @ts-expect-error
        token.walletAddress = user.walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error
        session.user.id = token.sub;
        // @ts-expect-error
        session.user.walletAddress = token.walletAddress;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
