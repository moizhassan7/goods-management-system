import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReturnListProps {
  returns: any[];
  onStatusChange: (id: number, status: string) => void;
}

export function ReturnList({ returns, onStatusChange }: ReturnListProps) {
  if (returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-xs font-medium">No return records logged yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4 w-20">ID</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Original Bilty</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Date Logged</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Reason</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Returned Goods</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Status</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Change Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((ret) => {
            const statusConfig = {
              PENDING: { label: 'PENDING', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800' },
              IN_TRANSIT: { label: 'IN TRANSIT', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800' },
              COMPLETED: { label: 'COMPLETED', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' },
              CANCELLED: { label: 'CANCELLED', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800' },
            }[ret.status as string] || { label: ret.status, bg: 'bg-slate-100 text-slate-700' };

            return (
              <TableRow key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors">
                <TableCell className="pl-4 font-mono font-bold text-slate-400">
                  #{ret.id}
                </TableCell>
                <TableCell className="font-mono font-bold text-blue-700 dark:text-blue-400">
                  #{ret.original_shipment_id}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  {ret.return_date ? format(new Date(ret.return_date), "MMM dd, yyyy") : '-'}
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-slate-700 dark:text-slate-300">
                  {ret.reason || 'Not specified'}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {ret.returnItems?.map((item: any) => (
                      <div key={item.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 mr-1">
                        <span className="font-bold">{item.goodsDetail?.itemCatalog?.item_description || 'Item'}</span>
                        <span>•</span>
                        <span>{item.quantity_returned} units</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn("inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border", statusConfig.bg)}>
                    {statusConfig.label}
                  </span>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Select
                    defaultValue={ret.status}
                    onValueChange={(value) => onStatusChange(ret.id, value)}
                  >
                    <SelectTrigger className="w-[120px] ml-auto h-7 text-[11px] rounded-lg border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}