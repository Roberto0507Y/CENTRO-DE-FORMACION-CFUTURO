import nodemailer from "nodemailer";
import { env } from "../../config/env";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type MailerConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

let transporter: nodemailer.Transporter | null = null;

function getMailerConfig(): MailerConfig {
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT;
  const user = env.SMTP_USER;
  const password = env.SMTP_PASSWORD;
  const from = env.SMTP_FROM?.trim() || `C.FUTURO <${user}>`;

  if (!host || !port || !user || !password) {
    throw new Error(
      "[smtp] SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD son requeridos para enviar correos."
    );
  }
  return { host, port, user, password, from };
}

function isSecurePort(port: number) {
  return port === 465;
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const cfg = getMailerConfig();
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: isSecurePort(cfg.port),
    auth: { user: cfg.user, pass: cfg.password },
  });
  return transporter;
}

export async function sendMail(input: SendMailInput): Promise<void> {
  const cfg = getMailerConfig();
  const tx = getTransporter();
  await tx.sendMail({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
