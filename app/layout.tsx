import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Church Care Hub",
    template: "%s | Church Care Hub"
  },
  description: "Private role-based visitor, member, attendance, care, and ministry follow-up workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
