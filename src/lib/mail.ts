import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

/** Send an email. Without SMTP_URL (development), the message is printed to the server log. */
export async function sendMail(to: string, subject: string, text: string) {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.log(`[mail] to=${to} subject=${JSON.stringify(subject)}\n${text}`);
    return;
  }
  transport ??= nodemailer.createTransport(url);
  await transport.sendMail({ from: process.env.MAIL_FROM || "Pacific Watchmen <no-reply@localhost>", to, subject, text });
}

export function appUrl(path: string): string {
  return new URL(path, process.env.APP_URL || "http://localhost:3000").toString();
}
