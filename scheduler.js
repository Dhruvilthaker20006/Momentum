const cron = require('node-cron');
const User = require('../models/User');
const Habit = require('../models/Habit');
const { sendReminderEmail } = require('./email');

// Maps day name to JS getDay() value
const DAY_MAP = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

/**
 * Runs every minute to check if any user's reminder time has arrived.
 * In production, consider running this on a separate worker or using a job queue.
 */
const startReminderScheduler = () => {
  console.log('📅 Reminder scheduler started');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentHour = now.getUTCHours().toString().padStart(2, '0');
      const currentMin = now.getUTCMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMin}`;
      const currentDayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getUTCDay()];

      // Find users whose reminder time matches current UTC time and has reminders enabled
      const users = await User.find({
        'reminders.enabled': true,
        'reminders.time': currentTime,
        'reminders.days': currentDayName
      });

      if (!users.length) return;
      console.log(`📧 Sending reminders to ${users.length} user(s) at ${currentTime}`);

      for (const user of users) {
        try {
          const today = now.toISOString().split('T')[0];

          // Get habits for today that are not yet completed
          const habits = await Habit.find({ user: user._id, isArchived: false });
          const todayHabits = habits.filter(h => h.shouldShowOn(today) && !h.isDoneOn(today));

          if (!todayHabits.length) {
            console.log(`✅ ${user.email} — all habits done, skipping reminder`);
            continue;
          }

          const habitData = todayHabits.map(h => ({
            name: h.name,
            emoji: h.emoji,
            streak: h.getStreak()
          }));

          await sendReminderEmail(user, habitData);
          console.log(`📨 Reminder sent to ${user.email} — ${todayHabits.length} habits pending`);
        } catch (err) {
          console.error(`Failed to send reminder to ${user.email}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Reminder scheduler error:', err);
    }
  });
};

module.exports = { startReminderScheduler };
