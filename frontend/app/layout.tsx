import React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "GraphRAG — Enterprise Document Intelligence",
  description:
    "Secure, graph-powered retrieval-augmented generation platform. Ask your documents anything with citations, RBAC, and full audit trails.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0e1a] text-slate-50 antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
