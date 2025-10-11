"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Lock } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center">
      {/* Simple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-purple-500/10" />
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 w-full">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 backdrop-blur-sm px-4 py-2 text-sm mb-8">
            <Shield className="size-4 text-primary" />
            <span className="font-medium">Decentralized API Marketplace</span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Turn Unused API Quota Into{" "}
            <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              Revenue
            </span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto">
            Join the first decentralized marketplace where developers monetize surplus API calls 
            through secure proxy routing and transparent blockchain settlements.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Button asChild size="lg" className="h-11 px-8 shadow-lg hover:shadow-xl transition-shadow">
              <Link href="/marketplace">
                Explore Marketplace
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-8" asChild>
              <Link href="/login">Start Earning Today</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">99.99% Uptime</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="size-4" />
              <span className="font-medium">Audited Contracts</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="size-4" />
              <span className="font-medium">Encrypted Routing</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
