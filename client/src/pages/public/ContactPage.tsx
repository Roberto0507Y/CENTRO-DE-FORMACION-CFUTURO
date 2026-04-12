import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Send,
  Tag,
  User,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Reveal } from "../../components/ui/Reveal";

const SUPPORT_EMAIL = "cfuturo.academia@gmail.com";
const WHATSAPP_NUMBER = "+502 0000 0000";
const WHATSAPP_LINK = "https://wa.me/50200000000";
const SUPPORT_HOURS = "Lun a Vie · 8:00 a.m. – 5:00 p.m.";

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
      {children}
    </label>
  );
}

function InputWithIcon({
  icon,
  className,
  ...props
}: {
  icon: React.ReactNode;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </div>
      <Input
        {...props}
        className={[
          "pl-10 border-slate-200/80 focus:border-blue-500/60 focus:ring-blue-500/25",
          className ?? "",
        ].join(" ")}
      />
    </div>
  );
}

function ContactCard({
  icon,
  title,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
  tone: "emerald" | "blue" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-600/15"
      : tone === "blue"
        ? "bg-blue-600/10 text-blue-700 ring-blue-600/15"
        : "bg-slate-900/5 text-slate-700 ring-slate-900/10";

  return (
    <Card className="border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${toneClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
          <div className="mt-0.5 text-sm text-slate-700">{value}</div>
          {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </Card>
  );
}

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const t = window.setTimeout(() => setSent(false), 5500);
    return () => window.clearTimeout(t);
  }, [sent]);

  const whatsappUrl = useMemo(() => {
    const lines = [
      name ? `Nombre: ${name}` : "",
      email ? `Correo: ${email}` : "",
      subject ? `Asunto: ${subject}` : "",
      message ? `Mensaje: ${message}` : "",
    ].filter(Boolean);
    return `${WHATSAPP_LINK}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [email, message, name, subject]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_380px_at_15%_10%,rgba(37,99,235,0.10),transparent_55%),radial-gradient(850px_360px_at_85%_30%,rgba(6,182,212,0.10),transparent_55%)]" />

        <div className="relative px-6 py-12 md:px-12">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur">
              Soporte
              <span className="h-1 w-1 rounded-full bg-blue-600" />
              Contacto
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Escríbenos cuando lo necesites
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Si tienes una duda con tu cuenta, cursos o pagos, aquí te ayudamos. Para cosas rápidas,
              WhatsApp suele ser lo mejor.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Sidebar */}
            <Reveal className="lg:col-span-5">
              <div className="grid gap-4">
                <ContactCard
                  icon={<MessageCircle className="h-5 w-5" />}
                  title="WhatsApp"
                  value={WHATSAPP_NUMBER}
                  hint="Respuesta típica: 24h"
                  tone="emerald"
                />
                <ContactCard
                  icon={<Mail className="h-5 w-5" />}
                  title="Correo"
                  value={SUPPORT_EMAIL}
                  hint="Ideal para solicitudes más largas."
                  tone="blue"
                />
                <ContactCard
                  icon={<Clock className="h-5 w-5" />}
                  title="Horario"
                  value={SUPPORT_HOURS}
                  tone="slate"
                />

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_18px_55px_rgba(16,185,129,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-600"
                >
                  <MessageCircle className="h-4 w-4" />
                  Escribir por WhatsApp
                </a>

                {/* Support panel */}
                <Card className="border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-900/5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Para ayudarte más rápido
                  </div>
                  <div className="mt-2 text-lg font-black tracking-tight text-slate-900">
                    Incluye estos datos
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
                      Tu correo (el mismo con el que ingresas).
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
                      El nombre del curso o una captura si aplica.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
                      Qué estabas intentando hacer y qué pasó.
                    </li>
                  </ul>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200">
                    Consejo: revisa tu bandeja de spam si te escribimos por correo.
                  </div>
                </Card>
              </div>
            </Reveal>

            {/* Form */}
            <Reveal className="lg:col-span-7" delayMs={120}>
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-lg shadow-slate-900/5">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/6 via-transparent to-cyan-400/10" />

                <div className="relative p-6 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Mensaje
                      </div>
                      <div className="mt-2 text-xl font-black tracking-tight text-slate-900">
                        Cuéntanos qué pasó
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Completa el formulario y te abrimos WhatsApp con el texto listo para enviar.
                      </p>
                    </div>
                  </div>

                  {sent ? (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <div className="min-w-0">
                        <div className="font-extrabold">Listo</div>
                        <div className="mt-0.5 text-emerald-800/90">
                          Se abrió WhatsApp. Solo presiona “Enviar” para contactarnos.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <form
                    className="mt-6 grid gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                      setSent(true);
                    }}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel>Tu nombre</FieldLabel>
                        <InputWithIcon
                          icon={<User className="h-4 w-4" />}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ej: Juan Pérez"
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Correo</FieldLabel>
                        <InputWithIcon
                          icon={<AtSign className="h-4 w-4" />}
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@correo.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Asunto</FieldLabel>
                      <InputWithIcon
                        icon={<Tag className="h-4 w-4" />}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ej: Acceso al curso / pago / contraseña"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Mensaje</FieldLabel>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-3 top-3 text-slate-400">
                          <Send className="h-4 w-4" />
                        </div>
                        <textarea
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/25"
                          rows={6}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Cuéntanos qué estabas intentando hacer…"
                        />
                      </div>
                      <div className="text-xs text-slate-500">
                        Tip: si es sobre un pago, menciona el curso y la fecha aproximada.
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
                      <div className="text-xs text-slate-500">
                        No guardamos datos aquí. Solo abrimos WhatsApp para enviarlo.
                      </div>
                      <Button
                        type="submit"
                        className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 shadow-[0_18px_50px_rgba(34,211,238,0.18)] ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_22px_60px_rgba(34,211,238,0.24)]"
                      >
                        <span className="inline-flex items-center gap-2">
                          Enviar por WhatsApp
                          <Send className="h-4 w-4" />
                        </span>
                      </Button>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200">
                      Si prefieres correo:{" "}
                      <a className="font-bold text-blue-700 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                        {SUPPORT_EMAIL}
                      </a>
                      .
                    </div>
                  </form>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}

