import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { PWAInstallBanner, OfflineIndicator } from "@/components/PWAInstallPrompt";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import Despesas from "./pages/Despesas";
import Assistencia from "./pages/Assistencia";
import Estoque from "./pages/Estoque";
import Compras from "./pages/Compras";
import Caixa from "./pages/Caixa";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <OfflineIndicator />
          <PWAInstallBanner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute><AppLayout><Vendas /></AppLayout></ProtectedRoute>} />
            <Route path="/despesas" element={<ProtectedRoute><AppLayout><Despesas /></AppLayout></ProtectedRoute>} />
            <Route path="/assistencia" element={<ProtectedRoute><AppLayout><Assistencia /></AppLayout></ProtectedRoute>} />
            <Route path="/caixa" element={<ProtectedRoute><AppLayout><Caixa /></AppLayout></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute><AppLayout><Estoque /></AppLayout></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute><AppLayout><Compras /></AppLayout></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><AppLayout><Relatorios /></AppLayout></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
