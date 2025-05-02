import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UploadIt Next.js Demo",
  description:
    "Demo for the UploadIt file upload library with server-side integration",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
