import { Inter, Cormorant_Garamond } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import StagingBanner from "./components/StagingBanner"
import { ThemeProvider } from "./components/ThemeProvider"
import FloatingThemeToggle from "./components/FloatingThemeToggle"

// Primary UI font — used for all body/nav/button/label text
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

// Display font — used for headings, logo, stat numbers
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata = {
  title:       "SnapReserve™",
  description: "Book unique spaces, instantly.",
}

export default async function RootLayout({ children }) {
  const headersList = await headers()
  const host = headersList.get("host") ?? ""
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cormorant.variable} antialiased`} suppressHydrationWarning>
        {/* Anti-FOUC: set data-theme from localStorage before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('sr-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia&&!window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()` }} />
        <ThemeProvider>
          <StagingBanner host={host} />
          {children}
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  )
}
