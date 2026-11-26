export type AppLockTimeoutMinutes = 0 | 1 | 5 | 15;

export type AppLockConfig = {
  enabled: boolean;
  pinHash: string;
  salt: string;
  timeoutMinutes: AppLockTimeoutMinutes;
  passkeyCredentialId: string | null;
};

const STORAGE_KEY = "moneyspender.applock.v1";
const LAST_ACTIVE_KEY = "moneyspender.applock.active.v1";

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(pin: string, config: Pick<AppLockConfig, "pinHash" | "salt">): Promise<boolean> {
  if (!isValidPin(pin) || !config.pinHash || !config.salt) return false;
  const computed = await hashPin(pin, config.salt);
  return computed === config.pinHash;
}

export function shouldLockOnResume(lastActiveMs: number | null, nowMs: number, timeoutMinutes: AppLockTimeoutMinutes): boolean {
  if (lastActiveMs === null) return true;
  if (timeoutMinutes === 0) return true;
  return nowMs - lastActiveMs >= timeoutMinutes * 60_000;
}

export function readAppLockConfig(): AppLockConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppLockConfig>;
    if (!parsed.enabled || !parsed.pinHash || !parsed.salt) return null;
    return {
      enabled: true,
      pinHash: parsed.pinHash,
      salt: parsed.salt,
      timeoutMinutes: parsed.timeoutMinutes === 0 || parsed.timeoutMinutes === 1 || parsed.timeoutMinutes === 5 || parsed.timeoutMinutes === 15 ? parsed.timeoutMinutes : 1,
      passkeyCredentialId: typeof parsed.passkeyCredentialId === "string" ? parsed.passkeyCredentialId : null,
    };
  } catch {
    return null;
  }
}

export function writeAppLockConfig(config: AppLockConfig | null) {
  if (typeof window === "undefined") return;
  try {
    if (!config) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LAST_ACTIVE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
    window.dispatchEvent(new Event("moneyspender:applock-changed"));
  } catch {
    // Ignore storage errors.
  }
}

export function markAppLockActive(nowMs = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LAST_ACTIVE_KEY, String(nowMs));
  } catch {
    // Ignore storage errors.
  }
}

export function readAppLockLastActive(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_ACTIVE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): ArrayBuffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    Boolean(navigator.credentials?.create) &&
    Boolean(navigator.credentials?.get)
  );
}

/** Registers a local platform authenticator (Touch ID / Face ID / fingerprint) for unlocking this PWA. */
export async function registerLocalPasskey(userLabel: string): Promise<string | null> {
  if (!isPasskeySupported()) return null;
  const challenge = new Uint8Array(32);
  const userId = new Uint8Array(16);
  crypto.getRandomValues(challenge);
  crypto.getRandomValues(userId);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "MoneySpender", id: window.location.hostname },
      user: { id: userId, name: userLabel || "moneyspender", displayName: userLabel || "MoneySpender" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  return credential ? toBase64Url(credential.rawId) : null;
}

export async function verifyLocalPasskey(credentialId: string): Promise<boolean> {
  if (!isPasskeySupported() || !credentialId) return false;
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{ type: "public-key", id: fromBase64Url(credentialId) }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  return Boolean(assertion);
}
