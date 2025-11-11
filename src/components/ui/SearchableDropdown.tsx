import React, { useEffect, useState } from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface SearchableDropdownProps {
  label: string
  endpoint?: string
  placeholder?: string
  // optional pre-fetched items - if provided this will be used instead of fetching from endpoint
  items?: Array<{ id: number | string; name?: string; vehicleNumber?: string; item_description?: string }>
  // value may be id (number|string) or a plain string to support legacy usage
  value?: string | number | null
  // called with the display string (legacy)
  onChange?: (value: string) => void
  // called when an item is selected (preferred) with normalized item { id, name }
  onSelectItem?: (item: { id: string; name: string }) => void
  // property name to use when creating new items (e.g., 'vehicleNumber' for vehicles or 'description' for items)
  createPropertyName?: string
}

export default function SearchableDropdown({
  label,
  endpoint,
  placeholder = "Search or add...",
  items: itemsProp,
  value,
  onChange,
  onSelectItem,
  createPropertyName,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  // const { toast } = useToast()

  // If `items` prop is provided, use it; otherwise fetch from endpoint
  useEffect(() => {
    if (Array.isArray(itemsProp) && itemsProp.length > 0) {
      // normalize incoming items to { id: string, name: string }
      const normalized = (itemsProp as any[]).map((it) => ({
        id: String(it.id),
        name: it.name ?? it.vehicleNumber ?? it.item_description ?? '',
      }))
      setItems(normalized)
      return
    }

    if (!endpoint) return

    const fetchItems = async () => {
      try {
        const res = await fetch(endpoint as string)
        const data = await res.json()
        // try to normalize if returned objects have different shapes
        const normalized = (Array.isArray(data) ? data : []).map((it: any) => ({
          id: String(it.id ?? it.register_number ?? ''),
          name: it.name ?? it.vehicleNumber ?? it.item_description ?? it.register_number ?? '',
        }))
        setItems(normalized)
      } catch (error) {
        console.error('Failed to fetch items:', error)
      }
    }

    fetchItems()
  }, [endpoint, itemsProp])

  const handleSelect = (item: { id: string; name: string }) => {
    if (onChange) onChange(item.name)
    if (onSelectItem) onSelectItem(item)
    setOpen(false)
  }

  const handleAddNew = async () => {
    const trimmed = search.trim()
    if (!trimmed) return

    const exists = items.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    )

    if (exists) {
      // If already exists → just select the matching item
      const matched = items.find((it) => it.name.toLowerCase() === trimmed.toLowerCase())!
      handleSelect(matched)
      return
    }

    // If no endpoint is provided we can't POST a new entry from here.
    if (!endpoint) {
      // fallback: just select the typed value (no server-side add)
      if (onChange) onChange(trimmed)
      if (onSelectItem) onSelectItem({ id: '', name: trimmed })
      setSearch("")
      setOpen(false)
      return
    }

    try {
      setLoading(true)
      // Build the request body based on the createPropertyName prop or fallback to 'name'
      const requestBody = createPropertyName 
        ? { [createPropertyName]: trimmed }
        : { name: trimmed }

      const res = await fetch(endpoint as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) throw new Error("Failed to add item")

      const newItem = await res.json()
      // normalize returned item
      const normalized = { id: String(newItem.id ?? newItem.register_number ?? ''), name: newItem.name ?? newItem.vehicleNumber ?? newItem.item_description ?? newItem.register_number ?? trimmed }
      setItems((prev) => [...prev, normalized]) // ✅ instantly add new item locally
      // notify consumers
      if (onChange) onChange(normalized.name)
      if (onSelectItem) onSelectItem(normalized)
      setSearch("")
      setOpen(false)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const selectedLabel = items.find((it) => String(it.id) === String(value))?.name

  return (
    <div className="w-full">
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
          >
            {selectedLabel ?? (typeof value === 'string' && value ? value : placeholder)}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  // only attempt to add when an endpoint is configured; otherwise just select
                  handleAddNew()
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </div>
                ) : endpoint ? (
                  `No results found. Press Enter to add "${search}".`
                ) : (
                  `No results found. Add is disabled (no endpoint configured).`
                )}
              </CommandEmpty>
              {items.map((item) => (
                <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      String(value) === item.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
export { SearchableDropdown }