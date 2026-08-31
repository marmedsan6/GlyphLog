import type { APIRequestContext } from "@playwright/test";
import { API_BASE_URL } from "./test-config";

interface CompanionIdentity {
  accessToken: string;
  deviceToken: string;
  deviceId: string;
}

export interface CompanionEntry {
  id: string;
  title: string;
  type: "anime" | "manga";
  current_progress: number | null;
}

export async function assertCompanionServices(
  request: APIRequestContext,
): Promise<void> {
  const healthUrl = new URL("/health", API_BASE_URL).toString();
  const response = await request.get(healthUrl);
  if (!response.ok()) {
    throw new Error(
      `Companion API unavailable: ${response.status()} ${await response.text()}`,
    );
  }
}

export async function provisionCompanionIdentity(
  request: APIRequestContext,
): Promise<CompanionIdentity> {
  await assertCompanionServices(request);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const register = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      email: `companion-${suffix}@example.com`,
      password: "TestPass123!",
    },
  });
  if (!register.ok()) {
    throw new Error(
      `Companion registration failed: ${register.status()} ${await register.text()}`,
    );
  }
  const { access_token: accessToken } = (await register.json()) as {
    access_token: string;
  };

  const pair = await request.post(`${API_BASE_URL}/devices/pair`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!pair.ok()) {
    throw new Error(
      `Companion pairing failed: ${pair.status()} ${await pair.text()}`,
    );
  }
  const { pairing_code: pairingCode } = (await pair.json()) as {
    pairing_code: string;
  };

  const activate = await request.post(`${API_BASE_URL}/devices/activate`, {
    data: { pairing_code: pairingCode, device_name: "Playwright Companion" },
  });
  if (!activate.ok()) {
    throw new Error(
      `Companion activation failed: ${activate.status()} ${await activate.text()}`,
    );
  }
  const activation = (await activate.json()) as {
    device_token: string;
    device_id: string;
  };

  return {
    accessToken,
    deviceToken: activation.device_token,
    deviceId: activation.device_id,
  };
}

export async function listCompanionEntries(
  request: APIRequestContext,
  token: string,
  title: string,
): Promise<CompanionEntry[]> {
  const response = await request.get(
    `${API_BASE_URL}/entries/?search=${encodeURIComponent(title)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok()) {
    throw new Error(
      `Companion entry query failed: ${response.status()} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { entries: CompanionEntry[] };
  return body.entries;
}

export async function revokeCompanionDevice(
  request: APIRequestContext,
  identity: CompanionIdentity,
): Promise<void> {
  const response = await request.delete(
    `${API_BASE_URL}/devices/${identity.deviceId}`,
    { headers: { Authorization: `Bearer ${identity.accessToken}` } },
  );
  if (!response.ok()) {
    throw new Error(
      `Companion revocation failed: ${response.status()} ${await response.text()}`,
    );
  }
}
