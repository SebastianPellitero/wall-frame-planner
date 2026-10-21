import type { Metadata, Viewport } from "next";
import { Archivo, Newsreader } from "next/font/google";
import "./globals.css";

// Interface, numbers and frame labels. The width axis lets frame labels
// condense on small frames (see docs/design/design-system.md §2, §3).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

// The app's few sentences: wordmark, section and dialog titles, empty wall.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "WallPlanner",
  description:
    "Plan a gallery wall to scale: arrange frames on your wall, snap them to a grid and preview them over a photo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // --color-surface: the top bar is the first thing under the browser chrome.
  themeColor: "#fcfcfa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
