import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Source_Serif_4, Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Patel CRM · Hub VisorLab",
  description: "Seguimiento de peticiones de todos los clientes, con acceso de revisión por cuenta.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className={`${sans.variable} ${serif.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
