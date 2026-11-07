import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MediLink",
  description: "Share how you feel and find a clinician to contact.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The Material Symbols stylesheet deliberately does NOT live here. Loading
    // it in the root layout made every route pay for a render-blocking
    // cross-origin request; the public pages need only eight glyphs and use
    // inline SVG instead. It is loaded in `(app)/layout.tsx`, so only
    // authenticated routes fetch it.
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
