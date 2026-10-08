import { StorageKeys, storage } from '@/lib/storage';

/**
 * A random id for this install, minted on first launch and kept in plain
 * storage, so it survives sign-in and sign-out but not a reinstall — which is
 * what the backend's device registry counts (see api/app.ts). It identifies
 * the install, never the person, and carries nothing about the device.
 */
let cached: Promise<string> | null = null;

function mint(): string {
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
}

export function getInstallationId(): Promise<string> {
  if (!cached) {
    cached = storage.get(StorageKeys.installationId).then(async (existing) => {
      if (existing) return existing;
      const id = mint();
      await storage.set(StorageKeys.installationId, id);
      return id;
    });
    // A failed storage read shouldn't stick for the whole session.
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}
