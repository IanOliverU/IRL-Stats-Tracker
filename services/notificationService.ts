import { formatMapDuration, getMapActivityLabel } from '@/lib/mapActivity';
import type { MapActivityType } from '@/models';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

const TRACKING_CHANNEL_ID = 'activity-tracking';

type NotificationsModule = typeof import('expo-notifications');

let notificationSetupPromise: Promise<void> | null = null;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let notificationHandlerConfigured = false;

function isNotificationPermissionGranted(status: {
  granted: boolean;
  ios?: { status?: number | null };
}): boolean {
  return (
    status.granted ||
    status.ios?.status === 3 ||
    status.ios?.status === 4
  );
}

async function getNotificationsModuleAsync(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web' || isRunningInExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications').catch((error) => {
      notificationsModulePromise = null;
      console.warn('Failed to load notifications module', error);
      return null;
    });
  }

  return notificationsModulePromise;
}

export async function configureNotificationPresentationAsync(): Promise<void> {
  if (notificationHandlerConfigured) {
    return;
  }

  const notifications = await getNotificationsModuleAsync();
  if (!notifications) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

export function initializeNotificationsAsync(): Promise<void> {
  if (!notificationSetupPromise) {
    notificationSetupPromise = getNotificationsModuleAsync()
      .then(async (notifications) => {
        if (!notifications || Platform.OS !== 'android') {
          return;
        }

        await notifications.setNotificationChannelAsync(TRACKING_CHANNEL_ID, {
          name: 'Activity Tracking',
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 150, 250],
          lightColor: '#ff8a3d',
          lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: false,
        });
      })
      .catch((error) => {
        notificationSetupPromise = null;
        console.warn('Failed to configure notifications', error);
      });
  }

  return notificationSetupPromise;
}

async function ensureNotificationPermissionAsync(): Promise<boolean> {
  const notifications = await getNotificationsModuleAsync();
  if (!notifications) {
    return false;
  }

  try {
    const currentStatus = await notifications.getPermissionsAsync();
    if (isNotificationPermissionGranted(currentStatus)) {
      return true;
    }

    const requestedStatus = await notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    return isNotificationPermissionGranted(requestedStatus);
  } catch (error) {
    console.warn('Failed to request notification permissions', error);
    return false;
  }
}

async function presentTrackingNotificationAsync(title: string, body: string): Promise<void> {
  const notifications = await getNotificationsModuleAsync();
  if (!notifications) {
    return;
  }

  await configureNotificationPresentationAsync();
  await initializeNotificationsAsync();

  const hasPermission = await ensureNotificationPermissionAsync();
  if (!hasPermission) {
    return;
  }

  try {
    await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: Platform.OS === 'android' ? { channelId: TRACKING_CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn('Failed to present tracking notification', error);
  }
}

export async function notifyTrackingStartedAsync(activityType: MapActivityType): Promise<void> {
  const activityLabel = getMapActivityLabel(activityType);

  await presentTrackingNotificationAsync(
    `${activityLabel} started`,
    `${activityLabel} tracking is live. Keep the app open while your route is being recorded.`
  );
}

export async function notifyTrackingCompletedAsync(payload: {
  activityType: MapActivityType;
  distanceMeters: number;
  elapsedMs: number;
}): Promise<void> {
  const activityLabel = getMapActivityLabel(payload.activityType);
  const distanceKilometers = (payload.distanceMeters / 1000).toFixed(2);
  const duration = formatMapDuration(payload.elapsedMs);

  await presentTrackingNotificationAsync(
    `${activityLabel} saved`,
    `${distanceKilometers} km in ${duration}. Your session is now in history.`
  );
}
