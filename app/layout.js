import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import StagingBanner from "./components/StagingBanner"
import { ThemeProvider } from "./components/ThemeProvider"
import FloatingThemeToggle from "./components/FloatingThemeToggle"

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
        {/* Anti-FOUC: set data-theme from localStorage before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('sr-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia&&!window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()` }} />
        <ThemeProvider>
          <StagingBanner />
          {children}
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  )
}
