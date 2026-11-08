import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { UploaderProvider } from "@/components/upload-status";
import "@/index.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
      <UploaderProvider>{children}</UploaderProvider>
    </ThemeProvider>
  );
}
