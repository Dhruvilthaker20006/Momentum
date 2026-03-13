const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// ── Welcome email ─────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: '⚡ Welcome to Momentum — Let\'s Build Great Habits!',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#7c6aff,#a78bfa);border-radius:16px;padding:16px 24px;">
              <span style="font-size:28px;font-weight:900;color:white;letter-spacing:-1px;">⚡ Momentum</span>
            </div>
          </div>
          <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px;">
            <h1 style="color:#f0f0f5;font-size:24px;margin:0 0 12px;font-weight:700;">
              Welcome, ${user.name}! 🎉
            </h1>
            <p style="color:#8888aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
              You've taken the first step toward building life-changing habits. 
              Momentum is here to keep you on track, every single day.
            </p>
            <div style="background:#18181f;border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="color:#f0f0f5;font-size:13px;font-weight:600;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">
                🚀 Get started
              </p>
              <ul style="color:#8888aa;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
                <li>Create your first habit</li>
                <li>Check it off daily to build a streak</li>
                <li>Enable email reminders in your profile</li>
                <li>Track your progress in Insights</li>
              </ul>
            </div>
            <a href="${process.env.CLIENT_URL}" style="display:block;text-align:center;background:linear-gradient(135deg,#7c6aff,#a78bfa);color:white;text-decoration:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;">
              Open Momentum →
            </a>
          </div>
          <p style="text-align:center;color:#555570;font-size:12px;margin-top:24px;">
            © ${new Date().getFullYear()} Momentum. You're receiving this because you just signed up.
          </p>
        </div>
      </body>
      </html>
    `
  });
};

// ── Daily reminder email ──────────────────────────────────
const sendReminderEmail = async (user, habits) => {
  const transporter = createTransporter();
  const habitList = habits.map(h => `
    <tr>
      <td style="padding:10px 14px;color:#f0f0f5;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">
        ${h.emoji} ${h.name}
      </td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;color:#8888aa;border-bottom:1px solid rgba(255,255,255,0.05);">
        🔥 ${h.streak}d streak
      </td>
    </tr>`).join('');

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: `⚡ ${user.name}, your habits are waiting — don't break the streak!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:28px;">
            <span style="font-size:24px;font-weight:900;color:#a78bfa;letter-spacing:-1px;">⚡ Momentum</span>
          </div>
          <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
            <h2 style="color:#f0f0f5;font-size:22px;margin:0 0 8px;">
              Good morning, ${user.name}! 🌅
            </h2>
            <p style="color:#8888aa;font-size:14px;margin:0 0 24px;">
              You have <strong style="color:#a78bfa;">${habits.length} habit${habits.length !== 1 ? 's' : ''}</strong> to complete today. 
              Keep your streak alive!
            </p>
            <table style="width:100%;border-collapse:collapse;background:#18181f;border-radius:12px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#1f1f28;">
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#555570;text-transform:uppercase;letter-spacing:1px;">Habit</th>
                  <th style="padding:10px 14px;text-align:right;font-size:11px;color:#555570;text-transform:uppercase;letter-spacing:1px;">Streak</th>
                </tr>
              </thead>
              <tbody>${habitList}</tbody>
            </table>
            <a href="${process.env.CLIENT_URL}" style="display:block;text-align:center;background:linear-gradient(135deg,#7c6aff,#a78bfa);color:white;text-decoration:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;">
              Complete Today's Habits →
            </a>
          </div>
          <p style="text-align:center;color:#555570;font-size:12px;margin-top:24px;">
            Manage reminder settings in your <a href="${process.env.CLIENT_URL}/profile" style="color:#7c6aff;">profile</a>.
          </p>
        </div>
      </body>
      </html>
    `
  });
};

// ── Password reset email ──────────────────────────────────
const sendPasswordResetEmail = async (user, resetToken) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: '🔑 Momentum — Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px;">
            <h2 style="color:#f0f0f5;font-size:22px;margin:0 0 12px;">Reset your password</h2>
            <p style="color:#8888aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
              We received a request to reset the password for your Momentum account. 
              This link expires in <strong style="color:#ffd166;">1 hour</strong>.
            </p>
            <a href="${resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#7c6aff,#a78bfa);color:white;text-decoration:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;margin-bottom:20px;">
              Reset Password →
            </a>
            <p style="color:#555570;font-size:12px;margin:0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  });
};

module.exports = { sendWelcomeEmail, sendReminderEmail, sendPasswordResetEmail };
