import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import StagingBanner from "./components/StagingBanner"
import { ThemeProvider } from "./components/ThemeProvider"
import ThemeToggle from "./components/ThemeToggle"

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <StagingBanner />
          {children}
          <ThemeToggle style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }} />
        </ThemeProvider>
      </body>
    </html>
  )
}
