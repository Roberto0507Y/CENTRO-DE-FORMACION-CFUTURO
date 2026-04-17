import { ShieldCheck, UserRound, KeyRound, MailCheck } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

function FieldLabel({
  label,
  helper,
}: {
  label: string;
  helper?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {helper ? (
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}

function FormSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/90 p-5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/65">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-slate-800">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

export function RegisterPage() {
  const { register } = useAuth();

  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dpi, setDpi] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [direccion, setDireccion] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ correo: string; emailSent: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      const result = await register({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        dpi: dpi.trim(),
        correo: correo.trim(),
        password,
        telefono: telefono.trim(),
        fecha_nacimiento: fechaNacimiento,
        direccion: direccion.trim(),
      });
      setSuccess({ correo: result.user.correo, emailSent: result.verification.emailSent });
    } catch {
      setError("No se pudo registrar. Verifica tus datos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-slate-950 px-6 py-7 text-white sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/85 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-cyan-200" aria-hidden="true" />
            Registro de estudiantes
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Crea tu cuenta en C.FUTURO</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/82 sm:text-base">
            Completa tu información para acceder a tus cursos, dar seguimiento a tu progreso y comenzar tu experiencia académica con orden y claridad.
          </p>
        </div>

        <form className="grid gap-6 p-6 sm:p-8" onSubmit={submit}>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-medium text-blue-800 dark:border-cyan-400/15 dark:bg-cyan-400/10 dark:text-cyan-100">
            Todos los campos son obligatorios. Al crear tu cuenta, te enviaremos un correo para confirmar y activar tu acceso.
          </div>

          {success ? (
            <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900 shadow-[0_18px_40px_-34px_rgba(16,185,129,0.45)] dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 ring-1 ring-emerald-200 dark:bg-slate-950/80 dark:text-emerald-200 dark:ring-emerald-400/25">
                  <MailCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-black">Cuenta creada. Confirma tu correo para activarla.</p>
                  <p className="mt-1">
                    {success.emailSent
                      ? `Enviamos un enlace de confirmación a ${success.correo}. Revisa tu bandeja principal y spam.`
                      : `Tu cuenta quedó pendiente, pero no pudimos enviar el correo a ${success.correo}. Verifica la configuración SMTP o solicita soporte.`}
                  </p>
                  <Link
                    to="/auth/login"
                    className="mt-3 inline-flex font-black text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-200"
                  >
                    Ir a iniciar sesión
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <FormSection
            icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
            title="Información personal"
            subtitle="Estos datos nos permiten identificar tu perfil y personalizar mejor tu experiencia dentro de la plataforma."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel label="Nombres" helper="Ingresa tus nombres tal como deseas mostrarlos en tu perfil." />
                <Input
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder="María Fernanda"
                  required
                  className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <FieldLabel label="Apellidos" helper="Usa tus apellidos completos para mantener tus datos actualizados." />
                <Input
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="López García"
                  required
                  className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <FieldLabel label="DPI" helper="Ingresa tu documento personal de identificación para validar tu perfil." />
                <Input
                  value={dpi}
                  onChange={(e) => setDpi(e.target.value)}
                  placeholder="1234567890101"
                  inputMode="numeric"
                  required
                  maxLength={20}
                  className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <FieldLabel label="Teléfono" helper="Incluye un número activo para facilitar contacto o soporte." />
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="502 1234 5678"
                  inputMode="tel"
                  required
                  className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <FieldLabel label="Fecha de nacimiento" helper="Nos ayuda a mantener tu información académica correctamente registrada." />
                <Input
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  type="date"
                  placeholder="YYYY-MM-DD"
                  required
                  className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
                />
              </div>
            </div>

            <div className="mt-5">
              <FieldLabel label="Dirección" helper="Agrega una referencia clara de tu ubicación o residencia." />
              <Input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Zona, colonia o dirección completa"
                required
                className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
              />
            </div>
          </FormSection>

          <FormSection
            icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}
            title="Datos de acceso"
            subtitle="Define las credenciales con las que ingresarás a tu cuenta y protegerás tu información."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel label="Correo electrónico" helper="Será tu usuario principal para iniciar sesión." />
                <Input
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  required
                  className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <FieldLabel label="Contraseña" helper="Usa al menos 8 caracteres y combina letras, números o símbolos." />
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
                />
              </div>
            </div>

            <div className="mt-5 md:max-w-[calc(50%-0.625rem)]">
              <FieldLabel label="Confirmar contraseña" helper="Repítela para verificar que no tenga errores de escritura." />
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Repite tu contraseña"
                required
                minLength={8}
                className="mt-2 rounded-xl border-slate-200/90 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
              />
            </div>
          </FormSection>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              ¿Ya tienes cuenta?{" "}
              <Link to="/auth/login" className="font-extrabold text-blue-600 hover:underline dark:text-cyan-300">
                Inicia sesión
              </Link>
            </div>
            <Button
              type="submit"
              disabled={isLoading || Boolean(success)}
              className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 text-base font-black shadow-[0_18px_40px_-18px_rgba(37,99,235,0.45)] hover:from-blue-500 hover:to-cyan-400 hover:shadow-[0_22px_44px_-18px_rgba(34,211,238,0.35)] sm:min-w-52"
            >
              {isLoading ? "Creando cuenta…" : success ? "Cuenta creada" : "Crear cuenta"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
