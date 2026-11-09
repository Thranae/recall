import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || 'teamsupport.recall@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.SMTP_USER || 'teamsupport.recall@gmail.com';
  const pass = process.env.SMTP_PASS;

  if (!pass || pass.trim() === '') {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
  });
}

export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  purpose: 'signup' | 'login' | 'reset' = 'signup'
): Promise<boolean> {
  const mailer = getTransporter();
  const title =
    purpose === 'signup'
      ? 'Verify your RECALL Account'
      : purpose === 'reset'
      ? 'Reset your RECALL Password'
      : 'Your RECALL Sign-in Code';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F7FC; margin: 0; padding: 24px; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px 28px; box-shadow: 0 12px 36px rgba(18, 38, 63, 0.08); border: 1px solid rgba(0, 0, 0, 0.06); }
        .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(32, 138, 239, 0.1); color: #208AEF; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; }
        h1 { color: #172B4D; font-size: 24px; font-weight: 700; margin: 0 0 12px 0; }
        p { color: #5E6C84; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; }
        .otp-box { background: linear-gradient(135deg, rgba(32, 138, 239, 0.08) 0%, rgba(94, 108, 132, 0.06) 100%); border: 1.5px solid rgba(32, 138, 239, 0.25); border-radius: 18px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .otp-code { font-family: 'SF Pro Display', -apple-system, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #208AEF; margin: 0; text-indent: 8px; }
        .expiry { color: #8993A4; font-size: 13px; margin-top: 8px; }
        .footer { font-size: 12px; color: #97A0AF; text-align: center; margin-top: 32px; border-top: 1px solid #EBECF0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">RECALL Security</span>
        <h1>${title}</h1>
        <p>Use the 6-digit verification code below to confirm your email and access your private visual memory archive.</p>
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
          <div class="expiry">Valid for the next 10 minutes</div>
        </div>
        <p style="font-size: 13px; color: #7A869A; margin-bottom: 0;">
          If you didn't request this code, you can safely ignore this email. Never share your verification code with anyone.
        </p>
        <div class="footer">
          © ${new Date().getFullYear()} RECALL • Intelligent Screenshot Memory. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (mailer) {
      await mailer.sendMail({
        from: `"RECALL Security" <${SMTP_USER}>`,
        to: toEmail,
        subject: `${otpCode} is your RECALL verification code`,
        html: htmlContent,
      });
      console.log(`[Email] OTP ${otpCode} successfully dispatched to ${toEmail}`);
      return true;
    } else {
      console.warn(`[Email] No SMTP credentials provided. OTP for ${toEmail}: ${otpCode}`);
      return false;
    }
  } catch (error) {
    console.error(`[Email] Error sending OTP email to ${toEmail}:`, error);
    // Even if external network SMTP fails (e.g. firewalled offline sandbox), log the code so user or automated test is never stranded
    console.log(`[Email Fallback] Verification code for ${toEmail} is: ${otpCode}`);
    return false;
  }
}

