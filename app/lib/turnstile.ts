interface TurnstileResult {
  enabled: boolean;
  success: boolean;
  error?: string;
}

interface TurnstileVerifyResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(request: Request, token: unknown, expectedAction: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { enabled: false, success: true };

  if (typeof token !== "string" || token.length < 10 || token.length > 2048) {
    return { enabled: true, success: false, error: "missing-token" };
  }

  const remoteIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  form.append("idempotency_key", crypto.randomUUID());
  if (remoteIp) form.append("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  const result = await response.json().catch(() => null) as TurnstileVerifyResponse | null;
  if (!response.ok || !result?.success) {
    return { enabled: true, success: false, error: result?.["error-codes"]?.join(",") || "siteverify-failed" };
  }

  if (result.action && result.action !== expectedAction) {
    return { enabled: true, success: false, error: "action-mismatch" };
  }

  return { enabled: true, success: true };
}
