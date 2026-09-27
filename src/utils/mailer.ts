import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: "Taskflow <onboarding@resend.dev>",
      to: [email],
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

    if (error) {
      console.error("[Taskflow Resend] Failed:", error);
      return false;
    }

    console.log(`[Taskflow Resend] OTP sent to ${email}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error("[Taskflow Resend] Error:", error);
    return false;
  }
}