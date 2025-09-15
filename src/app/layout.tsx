import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "./bootstrap-client";
import AppNavbar from "./components/AppNavbar.jsx";
import StoreProvider from "./GlobalRedux/provider";
import WelcomeModal from "./components/welcomeModal";
import GoogleAnalytics from "./components/googleAnalytics";

const geistSans = localFont({
  src: [
    {
      path: "../../public/fonts/geist-v3-latin-regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: [
    {
      path: "../../public/fonts/geist-mono-v3-latin-regular.woff2",
      weight: "400",
      style: "normal",
    },
    // Add other weights/styles as needed
  ],
  variable: "--font-geist-mono",
  display: "swap",
});
/*
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
*/
export const metadata: Metadata = {
  title: "Pacific Ocean Portal",
  description: "Developed by Pacific Community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <StoreProvider>
             <WelcomeModal />
             <GoogleAnalytics/>
          <AppNavbar />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
