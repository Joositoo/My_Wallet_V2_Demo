import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DemoBootstrap from "./components/DemoBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MyWallet · Demo de finanzas personales",
  description: "Demo interactiva de MyWallet: ingresos, gastos, suscripciones y deudas con datos de ejemplo. Hecha con Next.js.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <DemoBootstrap />
      </body>
    </html>
  );
}
