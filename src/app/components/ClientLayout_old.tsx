"use client";
import AppNavbar from "./AppNavbar.jsx";
import WelcomeModal from "./welcomeModal.jsx";
import StoreProvider from "../GlobalRedux/provider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <AppNavbar />
      <WelcomeModal />
      {children}
    </StoreProvider>
  );
}
