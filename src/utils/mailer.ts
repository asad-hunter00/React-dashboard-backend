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
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2>Taskflow Password Reset</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">
            ${otp}
          </div>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
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