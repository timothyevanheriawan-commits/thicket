import type { Metadata } from "next";
import { Fraunces, Onest } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Thicket",
  description:
    "A quiet place to log the small things — spending and tasks, together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${onest.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-brown">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
