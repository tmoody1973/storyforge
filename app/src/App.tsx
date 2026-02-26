import { BrowserRouter, Routes, Route } from "react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import LoginPage from "@/pages/LoginPage";
import CallbackPage from "@/pages/CallbackPage";
import DashboardPage from "@/pages/DashboardPage";
import NewStoryPage from "@/pages/NewStoryPage";
import ProductionPage from "@/pages/ProductionPage";
import ReviewPage from "@/pages/ReviewPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Authenticated>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/story/new" element={<NewStoryPage />} />
            <Route path="/story/:id" element={<ProductionPage />} />
            <Route path="/story/:id/review" element={<ReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/callback" element={<CallbackPage />} />
        </Routes>
        <Toaster />
      </Authenticated>
      <Unauthenticated>
        <Routes>
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Unauthenticated>
    </BrowserRouter>
  );
}
