import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

/**
 * POST /api/auth/send-verification
 * PRD 3.1.1 - Send 6-digit verification code to user's email
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase unavailable. Check .env.local and server logs." },
        { status: 503 }
      );
    }
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and userId are required" },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in Firestore with 10-minute expiry
    const verificationRef = doc(db, "email_verifications", userId);
    await setDoc(verificationRef, {
      code,
      email,
      userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      createdAt: new Date(),
    });

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.RESEND_FROM || "Voice AI <onboarding@resend.dev>";

    if (apiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject: "Verify your Voice AI Dashboard account",
          html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Resend API error:", res.status, err);
        return NextResponse.json(
          { error: "Failed to send verification email" },
          { status: 500 }
        );
      }
    } else {
      console.log(`[DEV] Verification code for ${email}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      ...(!apiKey && process.env.NODE_ENV === "development" && { code }),
    });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
