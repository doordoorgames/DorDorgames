import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import {
  getGetAuthMeQueryKey,
  setBaseUrl,
  useGetAuthMe,
} from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { PublicHome as Home, Pricing, Purchase } from "@/pages/public-site";
import Join from "@/pages/join";
import Host from "@/pages/host";
import Account from "@/pages/account";
import HostDashboard from "@/pages/host-dashboard";
import RoomView from "@/pages/room";
import AdminLogin from "@/pages/admin";
import AdminDashboard from "@/pages/admin-dashboard";
import GameLauncher from "@/pages/game-launcher";
import ShelvedGames from "@/pages/shelved-games";

setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? null);

const queryClient = new QueryClient();

function AuthenticatedRoom() {
  const account = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey(), retry: false },
  });
  useEffect(() => {
    if (account.error) {
      window.location.replace(
        `/account?returnTo=${encodeURIComponent(window.location.pathname)}`,
      );
    }
  }, [account.error]);
  if (account.isLoading || !account.data) {
    return (
      <div className="min-h-screen grid place-items-center font-mono text-secondary">
        VERIFYING ACCOUNT...
      </div>
    );
  }
  return <RoomView />;
}

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        {/* Platform routes */}
        <Route path="/" component={Home} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/checkout" component={Purchase} />
        <Route path="/purchase" component={Purchase} />
        <Route path="/join" component={Join} />
        <Route path="/join/:code" component={Join} />
        <Route path="/account" component={Account} />
        <Route path="/host" component={Host} />
        <Route path="/host/dashboard" component={HostDashboard} />
        <Route path="/room/:code" component={AuthenticatedRoom} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/shelved" component={ShelvedGames} />

        {/* Game launcher routes */}
        <Route path="/tfadhloon" component={GameLauncher} />
        <Route path="/aljasoos" component={GameLauncher} />
        <Route path="/flash" component={GameLauncher} />
        <Route path="/yesno" component={GameLauncher} />
        <Route path="/bomb" component={GameLauncher} />
        <Route path="/reactor" component={GameLauncher} />
        <Route path="/forehead" component={GameLauncher} />
        <Route path="/guessthecharacter" component={GameLauncher} />
        <Route path="/charades" component={GameLauncher} />
        <Route path="/dots" component={GameLauncher} />
        <Route path="/spy" component={GameLauncher} />
        <Route path="/doyouknowme" component={GameLauncher} />

        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
