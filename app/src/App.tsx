import { BrowserRouter, Routes, Route } from "react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import NewStoryPage from "@/pages/NewStoryPage";
import ProductionPage from "@/pages/ProductionPage";
import ReviewPage from "@/pages/ReviewPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthLoading>
        <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
          Loading...
        </div>
      </AuthLoading>
      <Authenticated>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/story/new" element={<NewStoryPage />} />
            <Route path="/story/:id" element={<ProductionPage />} />
            <Route path="/story/:id/review" element={<ReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster />
      </Authenticated>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
    </BrowserRouter>
  );
}
