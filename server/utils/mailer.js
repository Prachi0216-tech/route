const nodemailer = require('nodemailer');

// Cached transporter instance
let transporter = null;

/**
 * Initialize or get Nodemailer Transporter
 */
function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (user && pass) {
    // If user provided a Gmail address or custom SMTP
    if (host.includes('gmail.com') || (!process.env.SMTP_HOST && user.includes('@gmail.com'))) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass
        }
      });
    }
    console.log(`✉️ [MyRoute Mailer] Configured SMTP Transport for sender: ${user}`);
  } else {
    // Development fallback transporter
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
    console.log(`ℹ️ [MyRoute Mailer] SMTP credentials not set in server/.env (using fallback & terminal dispatch)`);
  }

  return transporter;
}

/**
 * Send real email verification OTP with responsive HTML template
 */
async function sendVerificationEmail(recipientEmail, otpCode, role = 'Commuter') {
  // Normalize common typo domains e.g. gamil.com -> gmail.com
  let cleanEmail = recipientEmail.toLowerCase().trim();
  cleanEmail = cleanEmail.replace(/@(gamil|gmial|gmai|gmaill)\.com$/, '@gmail.com');

  const mailTransporter = getTransporter();
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'MyRoute Transit <no-reply@myroute.in>';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyRoute Verification Code</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
      .container { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
      .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
      .brand { font-size: 24px; font-weight: 900; color: #38bdf8; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: #0284c7; color: white; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-top: 6px; }
      .title { font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
      .text { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
      .otp-box { background: #0f172a; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px; }
      .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; }
      .expiry { font-size: 12px; color: #f59e0b; margin-top: 8px; font-weight: 600; }
      .footer { border-top: 1px solid #334155; padding-top: 18px; margin-top: 24px; text-align: center; font-size: 12px; color: #64748b; }
      .security-note { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 10px 14px; font-size: 12px; color: #fbbf24; border-radius: 4px; margin-bottom: 20px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="brand">🚍 MyRoute Transit</div>
        <div class="badge">🇮🇳 All-India Live Public Transit System</div>
      </div>

      <div class="title">Verify Your Email Address</div>
      <div class="text">
        Hello,<br>
        Thank you for choosing <strong>MyRoute</strong> for your daily public transit journey. Please use the verification code below to confirm your email and proceed with ${role} registration.
      </div>

      <div class="otp-box">
        <div class="otp-code">${otpCode}</div>
        <div class="expiry">⏱️ Valid for 10 minutes only</div>
      </div>

      <div class="security-note">
        🔒 <strong>Security Warning:</strong> Never share this code or your password with anyone. MyRoute representatives will never ask for your verification OTP.
      </div>

      <div class="text" style="font-size: 12px;">
        If you did not request this verification code, you can safely ignore this email.
      </div>

      <div class="footer">
        © 2026 MyRoute Transit Platform • Pan-India Bus, Metro, Auto & E-Rickshaw Network
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: fromAddress,
    to: cleanEmail,
    subject: `🔐 ${otpCode} is your MyRoute Transit verification code`,
    text: `Your MyRoute verification code is ${otpCode}. Valid for 10 minutes. Please enter this code in the registration window.`,
    html: htmlContent
  };

  try {
    const hasCreds = Boolean(process.env.SMTP_USER || process.env.GMAIL_USER);
    if (hasCreds) {
      const info = await mailTransporter.sendMail(mailOptions);
      console.log(`\n======================================================`);
      console.log(`✅ [MyRoute Mailer] 📨 Real email dispatched to: ${cleanEmail}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`🔑 Verification Code: ${otpCode}`);
      console.log(`======================================================\n`);
      return { success: true, delivered: true, messageId: info.messageId, email: cleanEmail };
    } else {
      console.log(`\n======================================================`);
      console.log(`📧 [MyRoute Mail Service] 📨 Verification code for: ${cleanEmail}`);
      console.log(`🔑 Real OTP Generated: [ ${otpCode} ] (Valid 10 mins)`);
      console.log(`⚠️ SMTP Notice: To deliver live emails to Gmail inbox, set SMTP_USER & SMTP_PASS in server/.env`);
      console.log(`======================================================\n`);
      return { success: true, delivered: false, simulated: true, email: cleanEmail };
    }
  } catch (err) {
    console.error(`❌ [MyRoute Mailer Error] Failed sending email to ${cleanEmail}:`, err.message);
    console.log(`🔑 Backup OTP Code for ${cleanEmail}: ${otpCode}`);
    return { success: false, error: err.message, email: cleanEmail };
  }
}

module.exports = {
  sendVerificationEmail,
  getTransporter
};
