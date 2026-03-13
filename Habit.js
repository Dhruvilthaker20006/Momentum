const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema({
  date: {
    type: String,          // "YYYY-MM-DD"
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  note: { type: String, default: '' }
}, { _id: false });

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  emoji: { type: String, default: '🎯' },
  color: { type: String, default: '#7c6aff' },
  category: {
    type: String,
    enum: ['Health', 'Mind', 'Work', 'Social', 'Other'],
    default: 'Health'
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends', 'custom'],
    default: 'daily'
  },
  // For custom frequency — array of day names
  customDays: {
    type: [String],
    default: []
  },
  note: { type: String, default: '', maxlength: 200 },
  isArchived: { type: Boolean, default: false },

  // Embedded completions array (one entry per completed date)
  completions: [completionSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt
habitSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// ── Computed helpers ──────────────────────────────────────

// Check if this habit should appear on a given date
habitSchema.methods.shouldShowOn = function (dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay(); // 0=Sun
  switch (this.frequency) {
    case 'daily': return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekends': return dow === 0 || dow === 6;
    case 'custom': {
      const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return this.customDays.includes(names[dow]);
    }
    default: return true;
  }
};

// Check if completed on a specific date
habitSchema.methods.isDoneOn = function (dateStr) {
  return this.completions.some(c => c.date === dateStr);
};

// Get current streak (consecutive days ending today or yesterday)
habitSchema.methods.getStreak = function () {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const str = d.toISOString().split('T')[0];
    if (this.shouldShowOn(str)) {
      if (this.isDoneOn(str)) {
        streak++;
      } else {
        // Allow missing today (only break on past days)
        if (i > 0) break;
      }
    }
  }
  return streak;
};

// Total completions count
habitSchema.virtual('totalCompletions').get(function () {
  return this.completions.length;
});

habitSchema.set('toJSON', { virtuals: true });
habitSchema.set('toObject', { virtuals: true });

// Index for fast queries by user + date
habitSchema.index({ user: 1, isArchived: 1 });

module.exports = mongoose.model('Habit', habitSchema);
