import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { encryptApiKey } from "../../../lib/encryption";

/**
 * POST /api/keys/store
 * PRD 3.1.2 - Store encrypted API keys in Firestore
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase unavailable. Check .env.local and server logs." },
        { status: 503 }
      );
    }
    const { userId, service, apiKey } = await request.json();

    if (!userId || !service || !apiKey) {
      return NextResponse.json(
        { error: "userId, service, and apiKey are required" },
        { status: 400 }
      );
    }

    if (service !== "retell" && service !== "openrouter") {
      return NextResponse.json(
        { error: "Service must be 'retell' or 'openrouter'" },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const { encrypted, iv, authTag } = encryptApiKey(apiKey);

    // Store in Firestore
    const keyRef = doc(db, "api_keys", `${userId}_${service}`);
    await setDoc(keyRef, {
      user_id: userId,
      service,
      api_key_encrypted: encrypted,
      encryption_iv: iv,
      encryption_auth_tag: authTag,
      connected_at: new Date(),
      last_validated_at: new Date(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: `${service} API key stored successfully`,
    });
  } catch (error) {
    console.error("Error storing API key:", error);
    return NextResponse.json(
      { error: "Failed to store API key" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/keys/store?userId=xxx&service=retell|openrouter
 * Get stored API key connection status
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase unavailable. Check .env.local and server logs." },
        { status: 503 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const service = searchParams.get("service");

    if (!userId || !service) {
      return NextResponse.json(
        { error: "userId and service are required" },
        { status: 400 }
      );
    }

    const keyRef = doc(db, "api_keys", `${userId}_${service}`);
    const keySnap = await getDoc(keyRef);

    if (!keySnap.exists()) {
      return NextResponse.json({
        connected: false,
      });
    }

    const data = keySnap.data();
    return NextResponse.json({
      connected: true,
      connected_at: data.connected_at?.toDate().toISOString(),
      last_validated_at: data.last_validated_at?.toDate().toISOString(),
    });
  } catch (error) {
    console.error("Error checking API key status:", error);
    return NextResponse.json(
      { error: "Failed to check API key status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keys/store
 * PRD 3.6.1 - Disconnect: delete API key from storage
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase unavailable. Check .env.local and server logs." },
        { status: 503 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const service = searchParams.get("service");

    if (!userId || !service) {
      return NextResponse.json(
        { error: "userId and service are required" },
        { status: 400 }
      );
    }

    if (service !== "retell" && service !== "openrouter") {
      return NextResponse.json(
        { error: "Service must be 'retell' or 'openrouter'" },
        { status: 400 }
      );
    }

    const keyRef = doc(db, "api_keys", `${userId}_${service}`);
    await deleteDoc(keyRef);

    return NextResponse.json({
      success: true,
      message: `${service} API key disconnected`,
    });
  } catch (error) {
    console.error("Error disconnecting API key:", error);
    return NextResponse.json(
      { error: "Failed to disconnect API key" },
      { status: 500 }
    );
  }
}
