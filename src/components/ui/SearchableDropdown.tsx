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
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchableDropdownProps {
  label: string
  endpoint?: string
  placeholder?: string
  items?: Array<{ id: number | string; name?: string; vehicleNumber?: string; item_description?: string }>
  value?: string | number | null
  onChange?: (value: string) => void
  onSelectItem?: (item: { id: string; name: string }) => void
  createPropertyName?: string
  onNewItemAdded?: () => void
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
  onNewItemAdded,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (Array.isArray(itemsProp) && itemsProp.length > 0) {
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
      const matched = items.find((it) => it.name.toLowerCase() === trimmed.toLowerCase())!
      handleSelect(matched)
      return
    }

    if (!endpoint) {
      if (onChange) onChange(trimmed)
      if (onSelectItem) onSelectItem({ id: '', name: trimmed })
      setSearch("")
      setOpen(false)
      return
    }

    try {
      setLoading(true)
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
      const normalized = { 
        id: String(newItem.id ?? newItem.register_number ?? ''), 
        name: newItem.name ?? newItem.vehicleNumber ?? newItem.item_description ?? newItem.register_number ?? trimmed 
      }
      setItems((prev) => [...prev, normalized])
      if (onChange) onChange(normalized.name)
      if (onSelectItem) onSelectItem(normalized)
      if (onNewItemAdded) onNewItemAdded()
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
    <div className="w-full space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between rounded-xl h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs text-left",
              !selectedLabel && "text-slate-400 dark:text-slate-500 font-normal"
            )}
          >
            <span className="truncate">
              {selectedLabel ?? (typeof value === 'string' && value ? value : placeholder)}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden" align="start">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
              className="h-10 text-xs"
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.ctrlKey) {
                    const trimmed = search.trim()
                    if (trimmed) {
                      e.preventDefault()
                      handleAddNew()
                    }
                  }
                }
              }}
            />
            <CommandList className="max-h-60 p-1">
              <CommandEmpty className="p-3 text-center text-xs text-slate-500">
                {loading ? (
                  <div className="flex items-center justify-center py-2 text-blue-600 gap-2 font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving to system...
                  </div>
                ) : endpoint ? (
                  <div className="space-y-2">
                    <p className="text-slate-500">No match found for &quot;{search}&quot;</p>
                    {search.trim() && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleAddNew}
                        className="w-full text-xs font-semibold gap-1.5 h-8 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add &quot;{search}&quot;
                      </Button>
                    )}
                  </div>
                ) : (
                  `No records found.`
                )}
              </CommandEmpty>
              {items.map((item) => {
                const isSelected = String(value) === item.id
                return (
                  <CommandItem 
                    key={item.id} 
                    onSelect={() => handleSelect(item)}
                    className={cn(
                      "px-3 py-2 text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-between",
                      isSelected ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span className="truncate">{item.name}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
export { SearchableDropdown }