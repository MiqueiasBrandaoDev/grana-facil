import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthWrapper from "./components/auth/AuthWrapper";
import MainLayout from "./components/layout/MainLayout";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import WhatsApp from "./pages/WhatsApp";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import Goals from "./pages/Goals";
import Bills from "./pages/Bills";
import Cards from "./pages/Cards";
import Settings from "./pages/Settings";
import WebhookTest from "./pages/WebhookTest";
import WebhookDebug from "./pages/WebhookDebug";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Expor queryClient globalmente para logout seguro
if (typeof window !== 'undefined') {
  (window as any).queryClient = queryClient;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="granaboard-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthWrapper>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/bills" element={<Bills />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/webhook-test" element={<WebhookTest />} />
                <Route path="/webhook-debug" element={<WebhookDebug />} />
                <Route path="/admin" element={<AdminDashboard />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          </AuthWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
