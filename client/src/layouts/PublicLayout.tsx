import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PublicNavbar } from "../components/layout/PublicNavbar";
import { PublicFooter } from "../components/layout/PublicFooter";
import { Container } from "../components/ui/Container";
import { lazyNamed } from "../utils/lazyNamed";
import "../styles/public-brand.css";

const PublicChatbot = lazyNamed(
  () => import("../components/public/PublicChatbot"),
  "PublicChatbot"
);

export function PublicLayout() {
  const { pathname, hash } = useLocation();
  const isAuth = pathname.startsWith("/auth/");

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    if (pathname === "/" && hash) {
      const id = hash.slice(1);
      const frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (!target) {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          return;
        }
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname]);

  return (
    <div className="min-h-full overflow-x-clip bg-slate-50 dark:bg-slate-950">
      {isAuth ? null : <PublicNavbar />}
      <main className={isAuth ? "min-h-screen overflow-x-clip" : "overflow-x-clip py-6 sm:py-8 md:py-10"}>
        {isAuth ? (
          <Outlet />
        ) : (
          <Container>
            <Outlet />
          </Container>
        )}
      </main>
      {isAuth ? null : <PublicFooter />}
      {isAuth ? null : (
        <Suspense fallback={null}>
          <PublicChatbot />
        </Suspense>
      )}
    </div>
  );
}
