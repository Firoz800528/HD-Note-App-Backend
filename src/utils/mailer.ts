import nodemailer from 'nodemailer';

export async function sendOtpMail(to: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Your OTP Code',
      text: `Your OTP is ${code}. It will expire in 5 minutes.`,
    });
    console.log('OTP sent:', info.messageId);
  } catch (err: any) {
    console.error('Failed to send OTP:', err.message);
  }
}
