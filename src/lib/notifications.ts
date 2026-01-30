import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const initializeNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only available on native platforms');
    return false;
  }

  try {
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display === 'granted') {
      console.log('Notification permissions granted');
      return true;
    }
    console.log('Notification permissions denied');
    return false;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const schedulePeriodReminder = async (nextPeriodDate: Date, daysBeforeReminder: number = 2) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const reminderDate = new Date(nextPeriodDate);
    reminderDate.setDate(reminderDate.getDate() - daysBeforeReminder);

    // Don't schedule if reminder date is in the past
    if (reminderDate <= new Date()) {
      console.log('Period reminder date is in the past, skipping');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: '💜 Period Reminder',
          body: `Your period is expected in ${daysBeforeReminder} days. Stay prepared, beautiful! ✨`,
          id: 1001,
          schedule: { at: reminderDate },
          sound: 'default',
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
        },
      ],
    });
    console.log('Period reminder scheduled for:', reminderDate);
  } catch (error) {
    console.error('Error scheduling period reminder:', error);
  }
};

export const scheduleFertileWindowReminder = async (fertileStartDate: Date) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const reminderDate = new Date(fertileStartDate);
    reminderDate.setDate(reminderDate.getDate() - 1);

    // Don't schedule if reminder date is in the past
    if (reminderDate <= new Date()) {
      console.log('Fertile window reminder date is in the past, skipping');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🌸 Fertile Window Starting Soon',
          body: 'Your fertile window begins tomorrow. Check the app for more details! 💕',
          id: 1002,
          schedule: { at: reminderDate },
          sound: 'default',
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
        },
      ],
    });
    console.log('Fertile window reminder scheduled for:', reminderDate);
  } catch (error) {
    console.error('Error scheduling fertile window reminder:', error);
  }
};

export const scheduleOvulationReminder = async (ovulationDate: Date) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const reminderDate = new Date(ovulationDate);
    reminderDate.setHours(9, 0, 0, 0);

    // Don't schedule if reminder date is in the past
    if (reminderDate <= new Date()) {
      console.log('Ovulation reminder date is in the past, skipping');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🥚 Ovulation Day',
          body: "Today is your predicted ovulation day. You're at peak fertility! 🌟",
          id: 1003,
          schedule: { at: reminderDate },
          sound: 'default',
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
        },
      ],
    });
    console.log('Ovulation reminder scheduled for:', reminderDate);
  } catch (error) {
    console.error('Error scheduling ovulation reminder:', error);
  }
};

export const scheduleDailyLogReminder = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Schedule daily reminder at 8 PM
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(20, 0, 0, 0);

    // If it's past 8 PM today, schedule for tomorrow
    if (now > reminderTime) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: '📝 Daily Check-in',
          body: "How are you feeling today? Log your symptoms and mood! 💜",
          id: 1004,
          schedule: {
            at: reminderTime,
            repeats: true,
            every: 'day',
          },
          sound: 'default',
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
        },
      ],
    });
    console.log('Daily log reminder scheduled');
  } catch (error) {
    console.error('Error scheduling daily log reminder:', error);
  }
};

export const cancelAllNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }, { id: 1004 }] });
    console.log('All notifications cancelled');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
};

export const updateCycleReminders = async (
  nextPeriodDate: Date,
  cycleLength: number = 28
) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Cancel existing reminders first
    await cancelAllNotifications();

    // Calculate ovulation day (typically 14 days before next period)
    const ovulationDate = new Date(nextPeriodDate);
    ovulationDate.setDate(ovulationDate.getDate() - 14);

    // Calculate fertile window start (5 days before ovulation)
    const fertileStartDate = new Date(ovulationDate);
    fertileStartDate.setDate(fertileStartDate.getDate() - 5);

    // Schedule all reminders
    await schedulePeriodReminder(nextPeriodDate);
    await scheduleFertileWindowReminder(fertileStartDate);
    await scheduleOvulationReminder(ovulationDate);
    await scheduleDailyLogReminder();

    console.log('All cycle reminders updated');
  } catch (error) {
    console.error('Error updating cycle reminders:', error);
  }
};
