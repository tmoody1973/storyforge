import { StrictMode, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

/**
 * Bridge hook: adapts WorkOS AuthKit's useAuth to the shape
 * Convex's ConvexProviderWithAuth expects.
 *
 * Convex requires: { isLoading, isAuthenticated, fetchAccessToken }
 * WorkOS provides: { isLoading, user, getAccessToken }
 */
function useConvexAuthFromWorkOS() {
  const { isLoading, user, getAccessToken } = useAuth();

  const isAuthenticated = useMemo(() => !!user, [user]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isAuthenticated) return null;
      try {
        const token = await getAccessToken({
          forceRefresh: forceRefreshToken,
        });
        return token ?? null;
      } catch {
        return null;
      }
    },
    [isAuthenticated, getAccessToken],
  );

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID as string}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI as string}
    >
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromWorkOS}>
        <App />
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  </StrictMode>,
);
