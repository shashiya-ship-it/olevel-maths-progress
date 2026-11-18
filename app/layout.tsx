import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O/L Maths Progress",
  description: "O/L Mathematics student marks and progress tracking",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
