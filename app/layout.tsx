import type { Metadata } from "next";
import { Sora, Manrope } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "./mm4.css";
import "./mm43.css";
import SupportBubble from "../components/SupportBubble";

const display = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"] });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "MM Intelligence | Gestão inteligente e soluções digitais",
  description: "Gestão, análises, precificação e especialistas digitais para autônomos, serviços e e-commerce."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={`${display.variable} ${body.variable}`}><body>{children}<SupportBubble /></body></html>;
}
