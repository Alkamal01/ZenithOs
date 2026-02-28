import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

export const metadata: Metadata = {
    title: "ZenithOS Command Center",
    description: "Self-healing infrastructure dashboard",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-black text-slate-50`}
            >
                {children}
            </body>
        </html>
    );
}
