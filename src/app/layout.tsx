import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Prowider — Lead Distribution System',
  description: 'Mini lead generation and distribution platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <header className="header">
          <div className="header-inner">
            <a href="/" className="logo">
              <span className="logo-icon">⚡</span>
              Prowider
            </a>
            <nav className="nav">
              <a href="/request-service" className="nav-link">Submit Lead</a>
              <a href="/dashboard" className="nav-link">Dashboard</a>
              <a href="/test-tools" className="nav-link nav-link-accent">Test Tools</a>
            </nav>
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
