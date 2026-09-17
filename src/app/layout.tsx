import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "부엉부엉🦉몽골여행 | 여행 날씨",
  description:
    "9월 23–25일, 울란바타르와 미니사막, 테를지의 시간별 날씨와 밤하늘.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
