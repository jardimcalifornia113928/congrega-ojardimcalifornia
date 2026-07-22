import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Congregação Jardim Califórnia",
  description: "Gestão robusta de publicadores e atividades congregacionais",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <Toaster position="top-right" richColors theme="dark" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
