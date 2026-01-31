import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

/**
 * POST /api/auth/verify-email
 * PRD 3.1.1 - Verify 6-digit code and activate account
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase unavailable. Check .env.local and server logs." },
        { status: 503 }
      );
    }
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: "UserId and code are required" },
        { status: 400 }
      );
    }

    // Get verification record
    const verificationRef = doc(db, "email_verifications", userId);
    const verificationSnap = await getDoc(verificationRef);

    if (!verificationSnap.exists()) {
      return NextResponse.json(
        { error: "Verification code not found or expired" },
        { status: 404 }
      );
    }

    const verification = verificationSnap.data();
    const expiresAt = verification.expiresAt?.toDate();

    // Check if code expired
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 }
      );
    }

    // Verify code
    if (verification.code !== code) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Mark user as verified in Firestore
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      email_verified: true,
      email_verified_at: new Date(),
    });

    // Delete verification record
    await updateDoc(verificationRef, {
      verified: true,
      verifiedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
