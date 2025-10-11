import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto grid gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="text-sm font-semibold">Product</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/buyer" className="hover:underline">
                Browse APIs
              </Link>
            </li>
            <li>
              <Link href="/seller" className="hover:underline">
                Start Selling
              </Link>
            </li>
            <li>
              <Link href="/node" className="hover:underline">
                Run a Node
              </Link>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Resources</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="#" className="hover:underline">
                Docs
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Guides
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                API Status
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="#" className="hover:underline">
                About
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Careers
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Security
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Community</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="#" className="hover:underline">
                Discord
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                X/Twitter
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Blog
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto px-4 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} ProxyMarket. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
