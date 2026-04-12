import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { getSafeAuthRedirect } from "../../utils/authRedirect";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getSafeAuthRedirect(location.search);

  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [direccion, setDireccion] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const u = await register({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim(),
        password,
        telefono: telefono.trim() || null,
        fecha_nacimiento: fechaNacimiento || null,
        direccion: direccion.trim() || null,
      });
      navigate(redirectTo ?? (u.rol === "admin" ? "/admin" : u.rol === "docente" ? "/teacher" : "/student"));
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
          <div className="text-xs font-black uppercase tracking-[0.28em] text-white/70">C.FUTURO</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Crear cuenta</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-white/78">
            Completa tus datos para crear tu acceso como estudiante.
          </p>
        </div>

        <form className="grid gap-5 p-6 sm:p-8" onSubmit={submit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Nombres</label>
              <Input
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Jonatan"
                required
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Apellidos</label>
              <Input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Barrera"
                required
                className="mt-2"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Teléfono</label>
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Opcional"
                inputMode="tel"
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                Fecha de nacimiento
              </label>
              <Input
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                type="date"
                placeholder="YYYY-MM-DD"
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Dirección</label>
            <Input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Opcional"
              className="mt-2"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Correo</label>
              <Input
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                type="email"
                placeholder="correo@ejemplo.com"
                required
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Contraseña</label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Mínimo 8 caracteres"
                required
                className="mt-2"
              />
            </div>
          </div>

          {error ? <div className="text-sm text-rose-600 dark:text-rose-300">{error}</div> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              ¿Ya tienes cuenta?{" "}
              <Link to="/auth/login" className="font-extrabold text-blue-600 hover:underline dark:text-cyan-300">
                Inicia sesión
              </Link>
            </div>
            <Button type="submit" disabled={isLoading} className="sm:min-w-44">
              {isLoading ? "Creando…" : "Crear cuenta"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
