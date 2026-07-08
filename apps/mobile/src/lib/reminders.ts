import AsyncStorage from "@react-native-async-storage/async-storage";

// expo-notifications is a NATIVE module — load defensively so a build without
// it never crashes the settings screen.
const Notifications = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    return null;
  }
})();

export const remindersModuleAvailable = !!Notifications;
export const REMINDER_KEY = "rabbit.dailyReminder";
/** Local hour (24h) the end-of-day nudge fires. */
export const REMINDER_HOUR = 20;

// Show the reminder even when the app is foregrounded.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function isReminderEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(REMINDER_KEY)) === "1";
  } catch {
    return false;
  }
}

/**
 * Ask for permission and schedule a daily end-of-day reminder to log the day's
 * spending. Returns false if the module is missing or permission is denied.
 */
export async function enableDailyReminder(): Promise<boolean> {
  if (!Notifications) return false;
  const perm = await Notifications.requestPermissionsAsync();
  if (perm.status !== "granted") return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Log today's money",
      body: "A quick minute now keeps your daily streak alive.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: 0,
    },
  });
  await AsyncStorage.setItem(REMINDER_KEY, "1");
  return true;
}

export async function disableDailyReminder(): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, "0");
  if (Notifications) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      /* nothing scheduled */
    }
  }
}
