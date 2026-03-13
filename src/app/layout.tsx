import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/src/contexts/auth-context";
import { Suspense } from "react";
import ConfigureAmplifyClientSide from "@/src/components/ConfigureAmplify";
import "./globals.css";

export const metadata: Metadata = {
    title: "FloatChat - AI-Powered Ocean Data Platform",
    description:
        "Explore ARGO oceanographic data through natural language conversations and interactive visualizations",
    generator: "v0.app",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
            >
                <ConfigureAmplifyClientSide />
                <Suspense fallback={null}>
                    <AuthProvider>{children}</AuthProvider>
                </Suspense>
                <Analytics />
            </body>
        </html>
    );
}
