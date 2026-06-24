import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Join from "@/pages/join";
import Host from "@/pages/host";
import HostDashboard from "@/pages/host-dashboard";
import RoomView from "@/pages/room";
import AdminLogin from "@/pages/admin";
import AdminDashboard from "@/pages/admin-dashboard";
import GameLauncher from "@/pages/game-launcher";
import ShelvedGames from "@/pages/shelved-games";

const queryClient = new QueryClient();

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        {/* Platform routes */}
        <Route path="/" component={Home} />
        <Route path="/join" component={Join} />
        <Route path="/join/:code" component={Join} />
        <Route path="/host" component={Host} />
        <Route path="/host/dashboard" component={HostDashboard} />
        <Route path="/room/:code" component={RoomView} />
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
