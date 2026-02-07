import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Websites from "./pages/dashboard/Websites";
import Domains from "./pages/dashboard/Domains";
import Databases from "./pages/dashboard/Databases";
import FileManager from "./pages/dashboard/FileManager";
import EmailAccounts from "./pages/dashboard/EmailAccounts";
import Security from "./pages/dashboard/Security";
import Billing from "./pages/dashboard/Billing";
import Support from "./pages/dashboard/Support";
import SettingsPage from "./pages/dashboard/SettingsPage";
import BuyHosting from "./pages/dashboard/BuyHosting";
import SearchDomain from "./pages/dashboard/SearchDomain";
import DnsManager from "./pages/dashboard/DnsManager";
import Orders from "./pages/dashboard/Orders";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="websites" element={<Websites />} />
              <Route path="domains" element={<Domains />} />
              <Route path="databases" element={<Databases />} />
              <Route path="files" element={<FileManager />} />
              <Route path="email" element={<EmailAccounts />} />
              <Route path="security" element={<Security />} />
              <Route path="billing" element={<Billing />} />
              <Route path="support" element={<Support />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="buy-hosting" element={<BuyHosting />} />
              <Route path="search-domain" element={<SearchDomain />} />
              <Route path="domains/:id/dns" element={<DnsManager />} />
              <Route path="orders" element={<Orders />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
