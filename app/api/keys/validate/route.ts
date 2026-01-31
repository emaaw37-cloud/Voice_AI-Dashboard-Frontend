import { NextRequest, NextResponse } from "next/server";
import type { ValidateKeysRequest, ValidateKeysResponse } from "../../../lib/types";

/**
 * POST /api/keys/validate
 * PRD 3.1.2 - Validate Retell & OpenRouter keys (test API call before storing).
 */
export async function POST(request: NextRequest) {
  let body: ValidateKeysRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { retell_key, openrouter_key } = body;
  const results: ValidateKeysResponse = {
    retell: { valid: false },
    openrouter: { valid: false },
  };

  // Validate Retell API Key
  if (retell_key) {
    try {
      const response = await fetch("https://api.retellai.com/v2/list-calls", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${retell_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 1 }),
      });

      if (response.ok) {
        const data = await response.json();
        results.retell = {
          valid: true,
          account_info: data,
        };
      } else {
        const errorText = await response.text();
        results.retell = {
          valid: false,
          error: `Retell API error: ${response.status} ${errorText.slice(0, 100)}`,
        };
      }
    } catch (error) {
      results.retell = {
        valid: false,
        error: error instanceof Error ? error.message : "Failed to validate Retell key",
      };
    }
  }

  // Validate OpenRouter API Key
  if (openrouter_key) {
    try {
      // OpenRouter validation endpoint - check account info
      const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${openrouter_key}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        results.openrouter = {
          valid: true,
          account_info: data,
        };
      } else {
        const errorText = await response.text();
        results.openrouter = {
          valid: false,
          error: `OpenRouter API error: ${response.status} ${errorText.slice(0, 100)}`,
        };
      }
    } catch (error) {
      results.openrouter = {
        valid: false,
        error: error instanceof Error ? error.message : "Failed to validate OpenRouter key",
      };
    }
  }

  return NextResponse.json(results);
}
