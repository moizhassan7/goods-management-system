import { fetchWithTimeout } from '@/lib/api-client';
import React, { useEffect, useRef, useState } from "react"
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
import { toTitleCase } from "@/components/ui/input"
import { clearMasterListsClientCache } from "@/lib/master-lists-client"
import { toast } from "sonner"

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
  error?: string
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
  error,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    if (Array.isArray(itemsProp)) {
      const normalized = (itemsProp as Array<Record<string, unknown>>).map((it) => ({
        id: String(it.id ?? ''),
        name: toTitleCase(String(it.name ?? it.vehicleNumber ?? it.item_description ?? '')),
      }))
      setItems((prev) => {
        // Keep currently selected item if it was in prev but not yet in new itemsProp
        if (value && value !== 0 && value !== '0') {
          const current = prev.find((p) => String(p.id) === String(value))
          if (current && !normalized.some((n) => String(n.id) === String(value))) {
            return [current, ...normalized]
          }
        }
        return normalized
      })
      return
    }

    if (!endpoint) return

    const fetchItems = async () => {
      try {
        const res = await fetchWithTimeout(endpoint as string, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        })
        const data = await res.json()
        const normalized = (Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []).map((it) => ({
          id: String(it.id ?? it.register_number ?? ''),
          name: toTitleCase(String(it.name ?? it.vehicleNumber ?? it.item_description ?? it.register_number ?? '')),
        }))
        setItems((prev) => {
          if (value && value !== 0 && value !== '0') {
            const current = prev.find((p) => String(p.id) === String(value))
            if (current && !normalized.some((n) => String(n.id) === String(value))) {
              return [current, ...normalized]
            }
          }
          return normalized
        })
      } catch (error) {
        console.error('Failed to fetch items:', error)
      }
    }

    fetchItems()
  }, [endpoint, itemsProp, value])

  const handleSelect = (item: { id: string; name: string }) => {
    const titleName = toTitleCase(item.name)
    if (onChange) onChange(titleName)
    if (onSelectItem) onSelectItem({ id: item.id, name: titleName })
    setSearch("")
    setOpen(false)
  }

  const handleAddNew = async () => {
    const trimmed = toTitleCase(search.trim())
    if (!trimmed || savingRef.current) return
    savingRef.current = true

    const exists = items.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    )

    if (exists) {
      const matched = items.find((it) => it.name.toLowerCase() === trimmed.toLowerCase())!
      handleSelect(matched)
      savingRef.current = false
      return
    }

    if (!endpoint) {
      if (onChange) onChange(trimmed)
      if (onSelectItem) onSelectItem({ id: '', name: trimmed })
      setSearch("")
      setOpen(false)
      savingRef.current = false
      return
    }

    try {
      setLoading(true)
      const requestBody = createPropertyName 
        ? { [createPropertyName]: trimmed }
        : { name: trimmed }

      const res = await fetchWithTimeout(endpoint as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || errJson.error || "Failed to add item")
      }

      const newItem = await res.json()
      const normalized = { 
        id: String(newItem.id ?? newItem.register_number ?? ''), 
        name: toTitleCase(newItem.name ?? newItem.vehicleNumber ?? newItem.item_description ?? newItem.register_number ?? trimmed) 
      }
      setItems((prev) => {
        const alreadyInList = prev.some((p) => String(p.id) === String(normalized.id))
        return alreadyInList ? prev : [normalized, ...prev]
      })
      if (onChange) onChange(normalized.name)
      if (onSelectItem) onSelectItem(normalized)
      toast.success(`"${normalized.name}" saved and selected.`)
      clearMasterListsClientCache()
      if (onNewItemAdded) onNewItemAdded()
      setSearch("")
      setOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to add record.")
    } finally {
      savingRef.current = false
      setLoading(false)
    }
  }

  const saveTypedMasterData = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    e.stopPropagation()
    void handleAddNew()
  }

  const selectedLabel = (value && value !== 0 && value !== '0')
    ? items.find((it) => String(it.id) === String(value) || (typeof value === 'string' && it.name.toLowerCase() === value.toLowerCase()))?.name
    : null

  return (
    <div className="w-full space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{label}</label>
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setSearch("")
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full justify-between rounded-xl h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs text-left",
              !selectedLabel && "text-slate-400 dark:text-slate-500 font-normal",
              error && "border-red-500 dark:border-red-500"
            )}
          >
            <span className="truncate capitalize">
              {selectedLabel ?? (typeof value === 'string' && value && value !== '0' ? value : placeholder)}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[320px] p-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
          align="start"
          onKeyDownCapture={saveTypedMasterData}
        >
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={(val) => setSearch(toTitleCase(val))}
              className="h-10 text-xs capitalize"
              autoCapitalize="words"
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <CommandList className="max-h-60 p-1">
              <CommandEmpty className="p-3 text-center text-xs text-slate-500">
                {loading ? (
                  <div className="flex items-center justify-center py-2 text-blue-600 gap-2 font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving to system...
                  </div>
                ) : (
                  search.trim() ? `No matching records for "${search.trim()}"` : `No records found.`
                )}
              </CommandEmpty>
              {items.map((item) => {
                const isSelected = String(value) === item.id
                return (
                  <CommandItem 
                    key={item.id} 
                    value={item.name}
                    onSelect={() => handleSelect(item)}
                    className={cn(
                      "px-3 py-2 text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-between",
                      isSelected ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span className="truncate capitalize">{item.name}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandList>
            {search.trim().length >= 1 && !items.some((it) => it.name.toLowerCase() === search.trim().toLowerCase()) && endpoint && (
              <div className="p-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAddNew}
                  disabled={loading}
                  className="w-full text-xs font-semibold gap-1.5 h-8 justify-start text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Plus className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">Add &quot;{search.trim()}&quot;</span>
                  <kbd className="ml-auto shrink-0 rounded border border-blue-200 bg-white px-1 py-0.5 font-mono text-[10px] text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                    Ctrl+Enter
                  </kbd>
                </Button>
              </div>
            )}
          </Command>
          <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            Enter selects · Ctrl+Enter saves
          </div>
        </PopoverContent>
      </Popover>
      {error ? <p className="text-[11px] font-medium text-red-600">{error}</p> : null}
    </div>
  )
}
export { SearchableDropdown }