"use client"

import { useState } from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiCard } from "@/components/marketplace/api-card"
import { Search, Filter } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function MarketplacePage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [location, setLocation] = useState("all")
  const [selectedApi, setSelectedApi] = useState<any>(null)

  // Build query string
  const queryParams = new URLSearchParams()
  if (search) queryParams.set('search', search)
  if (category !== 'all') queryParams.set('category', category)
  if (location !== 'all') queryParams.set('location', location)

  const { data, error, isLoading } = useSWR(
    `/api/marketplace?${queryParams.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const apis = data?.items || []

  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-8 py-16 max-w-[1600px]">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Marketplace</h1>
        <p className="text-muted-foreground">
          Discover and purchase APIs from verified sellers
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search APIs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="AI/ML">AI/ML</SelectItem>
            <SelectItem value="Data">Data</SelectItem>
            <SelectItem value="Payment">Payment</SelectItem>
            <SelectItem value="Communication">Communication</SelectItem>
          </SelectContent>
        </Select>

        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="US">United States</SelectItem>
            <SelectItem value="EU">Europe</SelectItem>
            <SelectItem value="ASIA">Asia</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <Filter className="size-4" />
        </Button>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load API listings</p>
        </div>
      )}

      {!isLoading && !error && apis.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No APIs found matching your criteria</p>
        </div>
      )}

      {!isLoading && !error && apis.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {apis.map((api: any) => (
            <ApiCard
              key={api.id}
              api={api}
              onOpen={() => setSelectedApi(api)}
            />
          ))}
        </div>
      )}

      {/* Result count */}
      {!isLoading && apis.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {apis.length} API{apis.length !== 1 ? 's' : ''}
        </div>
      )}
    </section>
  )
}
