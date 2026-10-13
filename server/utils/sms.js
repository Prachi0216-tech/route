let twilioClient = null;

/**
 * Initialize Twilio Client if credentials are configured in .env
 */
function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken && !accountSid.includes('your_') && accountSid.startsWith('AC')) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(accountSid, authToken);
      console.log(`📱 [MyRoute SMS Gateway] Twilio SMS client initialized successfully.`);
    } catch (err) {
      console.warn(`⚠️ [MyRoute SMS Gateway] Could not initialize Twilio client:`, err.message);
    }
  }

  return twilioClient;
}

/**
 * Send real SMS verification OTP using Twilio
 * @param {string} phoneNumber - 10-digit or E.164 phone number
 * @param {string} otpCode - 6-digit OTP code
 */
async function sendSmsOtp(phoneNumber, otpCode) {
  const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
  const formattedPhone = cleanDigits.startsWith('91') && cleanDigits.length > 10
    ? `+${cleanDigits}`
    : `+91${cleanDigits.slice(-10)}`;

  const client = getTwilioClient();
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (client && twilioFrom) {
    try {
      const message = await client.messages.create({
        body: `🔐 ${otpCode} is your MyRoute Transit verification OTP. Valid for 10 minutes. Do not share this code with anyone.`,
        from: twilioFrom,
        to: formattedPhone
      });

      console.log(`\n======================================================`);
      console.log(`✅ [Twilio SMS Gateway] 📨 SMS dispatched to: ${formattedPhone}`);
      console.log(`📱 SID: ${message.sid}`);
      console.log(`🔑 OTP Code: ${otpCode}`);
      console.log(`======================================================\n`);

      return {
        success: true,
        delivered: true,
        sid: message.sid,
        phone: cleanDigits.slice(-10)
      };
    } catch (err) {
      console.error(`❌ [Twilio SMS Error] Failed sending SMS to ${formattedPhone}:`, err.message);
      return {
        success: false,
        delivered: false,
        error: err.message,
        phone: cleanDigits.slice(-10)
      };
    }
  }

  // Gateway log for dev testing when Twilio credentials are not yet set
  console.log(`\n======================================================`);
  console.log(`📱 [MyRoute SMS Service] 📨 SMS OTP for mobile: ${formattedPhone}`);
  console.log(`🔑 Real SMS OTP Generated: [ ${otpCode} ] (Valid 10 mins)`);
  console.log(`ℹ️ Twilio Setup: Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN & TWILIO_PHONE_NUMBER in server/.env for live SMS.`);
  console.log(`======================================================\n`);

  return {
    success: true,
    delivered: false,
    simulated: true,
    phone: cleanDigits.slice(-10)
  };
}

module.exports = {
  sendSmsOtp,
  getTwilioClient
};
