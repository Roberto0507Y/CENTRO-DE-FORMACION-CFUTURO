import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";
import { Spinner } from "../components/ui/Spinner";

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={22} />
      </div>
    );
  }

  if (!token) return <Navigate to="/auth/login" replace />;
  if (!user) return <Navigate to="/auth/login" replace />;

  if (roles && roles.length > 0 && !roles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

