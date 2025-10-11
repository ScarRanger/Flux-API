"use client"

import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function FeaturedAPIs() {
  const { data } = useSWR("/api/featured-apis", fetcher)
  const apis = data?.items ?? []

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex min-w-[720px] gap-4">
        {apis.map((a: any) => (
          <Card key={a.id} className="w-[280px] shrink-0 p-4">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded bg-secondary" />
              <div>
                <h3 className="text-sm font-semibold">{a.name}</h3>
                <p className="text-xs text-muted-foreground">{a.category}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium">{a.price}/call</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="font-medium">{a.discount}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quota</dt>
                <dd className="font-medium">{a.quota}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rating</dt>
                <dd className="font-medium">{a.rating}</dd>
              </div>
            </dl>
            <Button className="mt-4 w-full" size="sm">
              View
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
