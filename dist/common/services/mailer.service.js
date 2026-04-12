"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../config/env");
let transporter = null;
function getMailerConfig() {
    const host = env_1.env.SMTP_HOST;
    const port = env_1.env.SMTP_PORT;
    const user = env_1.env.SMTP_USER;
    const password = env_1.env.SMTP_PASSWORD;
    const from = env_1.env.SMTP_FROM;
    if (!host || !port || !user || !password || !from) {
        throw new Error("[smtp] SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_FROM son requeridos para enviar correos.");
    }
    return { host, port, user, password, from };
}
function isSecurePort(port) {
    return port === 465;
}
function getTransporter() {
    if (transporter)
        return transporter;
    const cfg = getMailerConfig();
    transporter = nodemailer_1.default.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: isSecurePort(cfg.port),
        auth: { user: cfg.user, pass: cfg.password },
    });
    return transporter;
}
async function sendMail(input) {
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
