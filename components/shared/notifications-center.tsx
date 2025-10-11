"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import useSWR from "swr"

type Noti = { id: string; title: string; time: string; cta?: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function NotificationsCenter() {
  const [open, setOpen] = useState(false)
  const { data } = useSWR<{ notifications: Noti[] }>("/api/activity", fetcher)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" aria-label="Notifications">
          Notifications
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {(data?.notifications ?? []).map((n) => (
            <div key={n.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{n.title}</p>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </div>
              {n.cta ? (
                <Button className="mt-2" size="sm">
                  {n.cta}
                </Button>
              ) : null}
            </div>
          ))}
          {!data?.notifications?.length && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
