"use client"

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export function ListingsTable() {
  const rows = [
    { api: "WeatherPro", status: "Active", price: "$0.0009", quota: "120k", earnings: "$540" },
    { api: "MapsXYZ", status: "Paused", price: "$0.0014", quota: "80k", earnings: "$310" },
    { api: "NewsFeed", status: "Active", price: "$0.0005", quota: "200k", earnings: "$730" },
  ]
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>API</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Quota</TableHead>
            <TableHead>Earnings</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.api}>
              <TableCell>{r.api}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>{r.price}</TableCell>
              <TableCell>{r.quota}</TableCell>
              <TableCell>{r.earnings}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="secondary">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
