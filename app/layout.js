import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import StagingBanner from "./components/StagingBanner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title:       "SnapReserve",
  description: "Book unique spaces, instantly.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StagingBanner />
        {children}
      </body>
    </html>
  )
}
