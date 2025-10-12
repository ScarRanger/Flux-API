"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

type Filters = { category: string; location: string; maxPrice: number }

export function ApiFilters({
  value,
  onChange,
}: {
  value: Filters
  onChange: (f: Filters) => void
}) {
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[]
    regions: string[]
    priceRange: { min: number; max: number }
  }>({
    categories: ["All"],
    regions: ["All"],
    priceRange: { min: 0, max: 0.005 }
  })

  useEffect(() => {
    // Fetch dynamic filter options
    fetch("/api/marketplace/filters")
      .then(r => r.json())
      .then(data => {
        setFilterOptions(data)
      })
      .catch(err => {
        console.error("Error fetching filter options:", err)
      })
  }, [])

  return (
    <Card className="p-4 space-y-4" role="region" aria-label="Filters">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Category</p>
        <Select value={value.category} onValueChange={(v) => onChange({ ...value, category: v })}>
          <SelectTrigger aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Location</p>
        <Select value={value.location} onValueChange={(v) => onChange({ ...value, location: v })}>
          <SelectTrigger aria-label="Location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.regions.map(region => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Max price per call</p>
        <Slider
          min={filterOptions.priceRange.min}
          max={filterOptions.priceRange.max}
          step={0.0001}
          value={[value.maxPrice]}
          onValueChange={([v]: number[]) => onChange({ ...value, maxPrice: v })}
          aria-label="Max price per call slider"
        />
        <p className="text-xs text-muted-foreground">{value.maxPrice ? `${value.maxPrice.toFixed(6)} ETH` : "Any"}</p>
      </div>
    </Card>
  )
}

