import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `Taskflow <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Taskflow Password Reset Verification Code",
      text: `Your Taskflow 6-digit verification code is: ${otp}. This code expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Taskflow Password Reset</h2>
          <p style="color: #475569; font-size: 16px;">
            We received a request to reset your Taskflow account password.
          </p>

          <div style="background: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7;">
              ${otp}
            </span>
          </div>

          <p style="color: #64748b; font-size: 14px;">
            This code will expire in <strong>5 minutes</strong>.
          </p>
        </div>
      `,
    });

    console.log(`[Taskflow Email] OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error("[Taskflow Email] Failed:", error);
    return false;
  }
}