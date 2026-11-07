import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import "@/index.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
