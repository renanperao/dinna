import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexoMenu",
  description: "Cardápio digital e gestão para restaurantes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
