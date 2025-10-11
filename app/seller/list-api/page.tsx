"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ProtectedGate } from "@/components/auth/protected"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function ListAPIPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
  }

  return (
    <ProtectedGate allow={["seller"]}>
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/seller">
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">List New API</CardTitle>
            <CardDescription>Add your API to the marketplace and start earning</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Name</label>
                <Input placeholder="e.g., OpenAI GPT-4" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input type="password" placeholder="Your API key" required />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price per Call (USD)</label>
                  <Input type="number" step="0.001" placeholder="0.001" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Available Quota</label>
                  <Input type="number" placeholder="10000" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Describe your API offering..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Listing..." : "List API"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/seller">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </ProtectedGate>
  )
}
