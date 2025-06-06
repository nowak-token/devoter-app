import { generateNonce } from "siwe";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const nonce = generateNonce();
    cookies().set("siwe-nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 5, // 5 minutes: 300 seconds
      path: "/",
      sameSite: "lax",
    });
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Nonce generation/setting cookie error:", error);
    return NextResponse.json(
      { message: "Failed to generate nonce. Please try again." },
      { status: 500 }
    );
  }
}
