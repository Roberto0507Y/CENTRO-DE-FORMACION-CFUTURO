import { Outlet, useLocation } from "react-router-dom";
import { PublicNavbar } from "../components/layout/PublicNavbar";
import { PublicFooter } from "../components/layout/PublicFooter";
import { Container } from "../components/ui/Container";

export function PublicLayout() {
  const { pathname } = useLocation();
  const isAuth = pathname.startsWith("/auth/");

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      {isAuth ? null : <PublicNavbar />}
      <main className={isAuth ? "min-h-screen" : "py-10"}>
        {isAuth ? (
          <Outlet />
        ) : (
          <Container>
            <Outlet />
          </Container>
        )}
      </main>
      {isAuth ? null : <PublicFooter />}
    </div>
  );
}
