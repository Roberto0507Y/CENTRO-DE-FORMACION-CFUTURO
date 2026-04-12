import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { IdleSessionTimeout } from "./components/auth/IdleSessionTimeout";
import { AppRouter } from "./routes/AppRouter";

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <IdleSessionTimeout />
        <AppRouter />
      </AuthProvider>
    </PreferencesProvider>
  );
}
