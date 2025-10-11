"use client"

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
  return (
    <Card className="p-4 space-y-4" role="region" aria-label="Filters">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Category</p>
        <Select value={value.category} onValueChange={(v) => onChange({ ...value, category: v })}>
          <SelectTrigger aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Weather">Weather</SelectItem>
            <SelectItem value="Maps">Maps</SelectItem>
            <SelectItem value="News">News</SelectItem>
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
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="EU">EU</SelectItem>
            <SelectItem value="APAC">APAC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Max price per call</p>
        <Slider
          min={0}
          max={0.005}
          step={0.0001}
          value={[value.maxPrice]}
          onValueChange={([v]) => onChange({ ...value, maxPrice: v })}
          aria-label="Max price per call slider"
        />
        <p className="text-xs text-muted-foreground">{value.maxPrice ? `$${value.maxPrice.toFixed(4)}` : "Any"}</p>
      </div>
    </Card>
  )
}
