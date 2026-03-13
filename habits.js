const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Habit = require('../models/Habit');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect); // All habit routes require auth

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// ── GET /api/habits ───────────────────────────────────────
// Returns all active habits for the logged-in user,
// optionally filtered by ?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id, isArchived: false })
      .sort({ createdAt: 1 });

    const { date } = req.query;
    const mapped = habits.map(h => {
      const obj = h.toObject({ virtuals: true });
      obj.streak = h.getStreak();
      if (date) {
        obj.shouldShowToday = h.shouldShowOn(date);
        obj.isDoneToday = h.isDoneOn(date);
      }
      return obj;
    });

    // If date filter, only return habits that apply
    const result = date ? mapped.filter(h => h.shouldShowToday) : mapped;
    res.json({ success: true, count: result.length, habits: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch habits' });
  }
});

// ── GET /api/habits/stats ─────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id, isArchived: false });
    const today = new Date().toISOString().split('T')[0];

    const todayHabits = habits.filter(h => h.shouldShowOn(today));
    const doneToday = todayHabits.filter(h => h.isDoneOn(today));

    // Last 7 days
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      habits.forEach(h => { if (h.shouldShowOn(str) && h.isDoneOn(str)) weekTotal++; });
    }

    const longestStreak = habits.reduce((max, h) => Math.max(max, h.getStreak()), 0);

    // Category breakdown
    const categories = {};
    habits.forEach(h => {
      if (!categories[h.category]) categories[h.category] = { total: 0, done: 0 };
      categories[h.category].total++;
      if (h.isDoneOn(today)) categories[h.category].done++;
    });

    res.json({
      success: true,
      stats: {
        totalHabits: habits.length,
        todayTotal: todayHabits.length,
        todayDone: doneToday.length,
        todayRate: todayHabits.length ? Math.round(doneToday.length / todayHabits.length * 100) : 0,
        weekTotal,
        longestStreak,
        categories
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ── POST /api/habits ──────────────────────────────────────
router.post('/', [
  body('name').trim().notEmpty().withMessage('Habit name is required').isLength({ max: 100 }),
  body('emoji').optional().isString(),
  body('color').optional().isString(),
  body('category').optional().isIn(['Health', 'Mind', 'Work', 'Social', 'Other']),
  body('frequency').optional().isIn(['daily', 'weekdays', 'weekends', 'custom']),
  body('note').optional().isLength({ max: 200 })
], validate, async (req, res) => {
  try {
    const habit = await Habit.create({ ...req.body, user: req.user._id });
    const obj = habit.toObject({ virtuals: true });
    obj.streak = habit.getStreak();
    res.status(201).json({ success: true, habit: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create habit' });
  }
});

// ── PATCH /api/habits/:id ─────────────────────────────────
router.patch('/:id', [
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('category').optional().isIn(['Health', 'Mind', 'Work', 'Social', 'Other']),
  body('frequency').optional().isIn(['daily', 'weekdays', 'weekends', 'custom'])
], validate, async (req, res) => {
  try {
    const allowed = ['name', 'emoji', 'color', 'category', 'frequency', 'customDays', 'note', 'isArchived'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const obj = habit.toObject({ virtuals: true });
    obj.streak = habit.getStreak();
    res.json({ success: true, habit: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update habit' });
  }
});

// ── DELETE /api/habits/:id ────────────────────────────────
router.delete('/:id', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete habit' });
  }
});

// ── POST /api/habits/:id/complete ─────────────────────────
router.post('/:id/complete', [
  param('id').isMongoId(),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
  body('note').optional().isString().isLength({ max: 200 })
], validate, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const { date, note } = req.body;

    // Toggle: if already done, remove; otherwise add
    const existingIdx = habit.completions.findIndex(c => c.date === date);
    let action;
    if (existingIdx !== -1) {
      habit.completions.splice(existingIdx, 1);
      action = 'uncompleted';
    } else {
      habit.completions.push({ date, note: note || '' });
      action = 'completed';
    }

    await habit.save();
    const obj = habit.toObject({ virtuals: true });
    obj.streak = habit.getStreak();
    res.json({ success: true, action, habit: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle completion' });
  }
});

// ── GET /api/habits/:id/history ───────────────────────────
// Returns completion history for last N days
router.get('/:id/history', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const days = parseInt(req.query.days || '30');
    const history = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const str = d.toISOString().split('T')[0];
      history.push({
        date: str,
        applicable: habit.shouldShowOn(str),
        completed: habit.isDoneOn(str)
      });
    }

    res.json({ success: true, habitId: habit._id, history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

module.exports = router;
