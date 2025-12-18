
import { Reminder } from '../types';

const REMINDER_KEY = 'remindme_ai_reminders';

export const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
};

const getReminders = (): Reminder[] => {
  try {
    const data = localStorage.getItem(REMINDER_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveReminders = (reminders: Reminder[]) => {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders));
};

const triggerNotification = (reminder: Reminder) => {
  if (Notification.permission === 'granted') {
    // Play a sound if possible (optional)
    try {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
        audio.play().catch(() => {}); // Ignore auto-play errors
    } catch(e) {}

    new Notification("Your New AI Friend", {
      body: reminder.label,
      icon: 'https://cdn-icons-png.flaticon.com/512/3239/3239952.png', // Generic bell icon
      tag: reminder.id
    });
  } else {
    // Fallback if permissions denied
    alert(`🔔 REMINDER: ${reminder.label}`);
  }

  // Mark as completed
  const all = getReminders();
  const updated = all.map(r => r.id === reminder.id ? { ...r, completed: true } : r);
  saveReminders(updated);
};

export const scheduleReminder = (reminder: Reminder) => {
  const now = Date.now();
  const delay = reminder.timestamp - now;

  // Save first
  const all = getReminders();
  // Avoid duplicates
  if (!all.find(r => r.id === reminder.id)) {
      all.push(reminder);
      saveReminders(all);
  }

  if (delay > 0) {
    // If it's within the next 24 days (setTimeout limit approx), schedule it
    // For a real app, we'd check periodically, but this works for demo
    if (delay < 2073600000) { 
        setTimeout(() => {
            triggerNotification(reminder);
        }, delay);
    }
  } else if (delay > -60000) {
      // If passed within the last minute, trigger immediately
      triggerNotification(reminder);
  }
};

export const loadAndSchedulePendingReminders = () => {
  const all = getReminders();
  const now = Date.now();

  all.forEach(reminder => {
    if (!reminder.completed && reminder.timestamp > now) {
       const delay = reminder.timestamp - now;
       setTimeout(() => triggerNotification(reminder), delay);
    }
  });
};

export const getPendingRemindersCount = (): number => {
    return getReminders().filter(r => !r.completed && r.timestamp > Date.now()).length;
};