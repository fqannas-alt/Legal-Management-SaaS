import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PortalShell } from '@/components/portal-shell';
import NotFound from '@/pages/not-found';
import {
  AuditPage,
  ClientsPage,
  DashboardPage,
  ModulePage,
  SettingsPage,
  UsersPage,
} from '@/pages/portal-pages';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  return <DashboardPage />;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <PortalShell>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/clients" component={ClientsPage} />
          <Route path="/users" component={UsersPage} />
          <Route path="/audit" component={AuditPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/requests"><ModulePage module="/requests" /></Route>
          <Route path="/matters"><ModulePage module="/matters" /></Route>
          <Route path="/litigation"><ModulePage module="/litigation" /></Route>
          <Route path="/sub-clients"><ModulePage module="/sub-clients" /></Route>
          <Route path="/parties"><ModulePage module="/parties" /></Route>
          <Route path="/documents"><ModulePage module="/documents" /></Route>
          <Route path="/reminders"><ModulePage module="/reminders" /></Route>
          <Route path="/reports"><ModulePage module="/reports" /></Route>
          <Route component={NotFound} />
        </Switch>
      </PortalShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
