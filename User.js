const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [60, 'Name cannot exceed 60 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false   // never return password by default
  },
  avatar: {
    type: String,
    default: ''
  },
  // Email reminder preferences
  reminders: {
    enabled: { type: Boolean, default: false },
    time: { type: String, default: '08:00' },    // "HH:MM" in user's local time
    timezone: { type: String, default: 'UTC' },
    days: {
      type: [String],
      default: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    }
  },
  // Password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  isVerified: { type: Boolean, default: false },
  verifyToken: String,

  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Safe public profile (no password)
userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    reminders: this.reminders,
    isVerified: this.isVerified,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
