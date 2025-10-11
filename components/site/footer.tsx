import Link from "next/link"
import { Github, Twitter, Mail, Zap } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full " />
              <div className="relative bg-gradient-to-br from-cyan-400 to-cyan-600 p-2 rounded-xl ">
                <Zap className="size-5 text-white" fill="currentColor" />
              </div>
            </div>
            <span className="font-bold text-xl text-white">
              FluxAPI
            </span>
          </Link>

            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              The decentralized marketplace for monetizing unused API quota through
              secure proxy routing and blockchain settlements.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 hover:bg-accent transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="size-5" />
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 hover:bg-accent transition-colors"
                aria-label="GitHub"
              >
                <Github className="size-5" />
              </Link>
              <Link
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 hover:bg-accent transition-colors"
                aria-label="Discord"
              >
              </Link>
              <Link
                href="mailto:support@fluxapi.io"
                className="rounded-md p-2 hover:bg-accent transition-colors"
                aria-label="Email"
              >
                <Mail className="size-5" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/marketplace"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  href="/node"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Operate Node
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/api"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  API Reference
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FluxAPI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link
              href="/security"
              className="hover:text-foreground transition-colors"
            >
              Security
            </Link>
            <Link
              href="/status"
              className="hover:text-foreground transition-colors"
            >
              Status
            </Link>
            <Link
              href="/audits"
              className="hover:text-foreground transition-colors"
            >
              Audits
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
