import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import MentionsLegales from "./pages/MentionsLegales.tsx";
import CGV from "./pages/CGV.tsx";
import Confidentialite from "./pages/Confidentialite.tsx";

const queryClient = new QueryClient();

/** Dark mode automatique selon l'heure :
 *  20h00 → 07h00 = mode sombre (fond noir/gris, grilles orangées)
 *  07h00 → 20h00 = mode clair (fond blanc)
 */
function useTimeBasedDarkMode() {
  useEffect(() => {
    const apply = () => {
      const h = new Date().getHours();
      const isDark = h >= 20 || h < 7;
      document.documentElement.classList.toggle("dark", isDark);
    };
    apply();
    // Réévaluer chaque minute
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);
}

const App = () => {
  useTimeBasedDarkMode();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/cgv" element={<CGV />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
