import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { postRaw } from '@/api/client';
import { getInstallationId } from '@/lib/installation';
import type { PushPermission } from '@/lib/push-notifications';

/**
 * Tells the backend this install is in use: what the admin dashboard's App
 * page counts as an active device, and how admin push campaigns find it.
 * Goes with the bearer token when signed in, which links the install to the
 * account; signed out, it unlinks it.
 */
export async function sendHeartbeat(push: {
  token: string | null;
  permission: PushPermission;
}): Promise<void> {
  await postRaw('/app/devices/heartbeat', {
    installationId: await getInstallationId(),
    platform: Platform.OS,
    osVersion: Device.osVersion,
    appVersion: Constants.expoConfig?.version ?? null,
    deviceModel: Device.modelName,
    pushToken: push.token,
    pushPermission: push.permission,
  });
}

/** Reports a tap on an admin campaign push, for its "opened" count. */
export async function recordCampaignOpen(campaignId: string): Promise<void> {
  await postRaw(`/app/campaigns/${encodeURIComponent(campaignId)}/open`, {
    installationId: await getInstallationId(),
  });
}
