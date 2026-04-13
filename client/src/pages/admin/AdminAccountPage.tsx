import { Suspense } from "react";
import { Spinner } from "../../components/ui/Spinner";
import { lazyNamed } from "../../utils/lazyNamed";

const AccountPanel = lazyNamed(() => import("../../components/account/AccountPanel"), "AccountPanel");

export function AdminAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner />
        </div>
      }
    >
      <AccountPanel />
    </Suspense>
  );
}
