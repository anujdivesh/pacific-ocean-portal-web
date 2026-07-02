import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./bootstrap-client";
import AppNavbar from "./components/AppNavbar.jsx";
import StoreProvider from "./GlobalRedux/provider";
import WelcomeModal from "./components/welcomeModal";
import GoogleAnalytics from "./components/googleAnalytics";
import ChunkErrorReload from "./components/ChunkErrorReload";
import { withBasePath } from "./lib/basePath";


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
  // Explicit icon URL so the favicon resolves under the deploy's basePath
  // (Next does not auto-prefix metadata icon hrefs). Without this the browser
  // requests /favicon.ico at the root and 404s when served under a subpath.
  icons: {
    icon: withBasePath("/favicon.ico"),
    shortcut: withBasePath("/favicon.ico"),
    apple: withBasePath("/favicon.ico"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark-mode" suppressHydrationWarning>
      <head>
        {/* The server renders <html class="dark-mode"> (the app default) so the
            common case hydrates with no mismatch. Before first paint, switch to
            light ONLY if the user explicitly stored 'light' — avoids the flash of
            the default (white) background. Mirrors AppNavbar's logic. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='light'){var e=document.documentElement;e.classList.remove('dark-mode');e.classList.add('light-mode');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ChunkErrorReload />
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
