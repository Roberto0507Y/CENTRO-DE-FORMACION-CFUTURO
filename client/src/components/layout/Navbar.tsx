import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { Container } from "../ui/Container";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <Container className="flex items-center justify-between py-3">
        <Link to="/" className="group flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 font-black text-white shadow-sm">
            CF
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight text-slate-900 group-hover:text-blue-700">
              C.FUTURO
            </div>
            <div className="text-xs text-slate-500">Campus</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink
            to="/courses"
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-sm font-semibold ${
                isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
              }`
            }
          >
            Cursos
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/auth/login" className="hidden md:block">
                <Button variant="ghost">Ingresar</Button>
              </Link>
              <Link to="/auth/register">
                <Button>Crear cuenta</Button>
              </Link>
            </>
          ) : (
            <>
              <Link
                to={
                  user.rol === "admin"
                    ? "/admin"
                    : user.rol === "docente"
                      ? "/teacher"
                      : "/student"
                }
                className="hidden md:block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Panel
              </Link>
              <Button variant="ghost" onClick={logout}>
                Salir
              </Button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
