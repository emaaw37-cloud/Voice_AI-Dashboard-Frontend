import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { UserProfile } from "../../lib/types";

/**
 * GET /api/profile?userId=xxx
 * PRD 3.6.2, 3.6.3 - Get user profile and billing preferences
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase unavailable. Check .env.local and server logs." },
        { status: 503 }
      );
    }
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({
        id: userId,
        email: "",
        business_name: "",
        phone_number: "",
        timezone: "America/New_York",
        billing_email: "",
        email_verified: false,
        autopay_enabled: false,
      } satisfies Partial<UserProfile>);
    }

    const data = userSnap.data();
    const profile: Partial<UserProfile> = {
      id: userId,
      email: data.email ?? "",
      business_name: data.business_name ?? "",
      contact_email: data.contact_email ?? data.email ?? "",
      phone_number: data.phone_number ?? "",
      timezone: data.timezone ?? "America/New_York",
      billing_email: data.billing_email ?? data.email ?? "",
      email_verified: data.email_verified ?? false,
      autopay_enabled: data.autopay_enabled ?? false,
      fanbasis_customer_id: data.fanbasis_customer_id,
    };
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * PRD 3.6.2, 3.6.3 - Update profile (business_name, phone_number, timezone, billing_email, autopay_enabled)
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase unavailable. Check .env.local and server logs." },
        { status: 503 }
      );
    }
    const body = await request.json();
    const {
      userId,
      business_name,
      contact_email,
      phone_number,
      timezone,
      billing_email,
      autopay_enabled,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    const updates: Record<string, unknown> = {};
    if (business_name !== undefined) updates.business_name = business_name;
    if (contact_email !== undefined) updates.contact_email = contact_email;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (timezone !== undefined) updates.timezone = timezone;
    if (billing_email !== undefined) updates.billing_email = billing_email;
    if (autopay_enabled !== undefined) updates.autopay_enabled = autopay_enabled;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    if (userSnap.exists()) {
      await setDoc(userRef, updates, { merge: true });
    } else {
      await setDoc(userRef, { ...updates, email_verified: false }, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
