import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ReturnListProps {
  returns: any[];
  onStatusChange: (id: number, status: string) => void;
}

export function ReturnList({ returns, onStatusChange }: ReturnListProps) {
  const statusColors = {
    PENDING: "bg-yellow-500",
    IN_TRANSIT: "bg-blue-500",
    COMPLETED: "bg-green-500",
    CANCELLED: "bg-red-500"
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Return ID</TableHead>
            <TableHead>Shipment ID</TableHead>
            <TableHead>Return Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((ret) => (
            <TableRow key={ret.id}>
              <TableCell>{ret.id}</TableCell>
              <TableCell>{ret.original_shipment_id}</TableCell>
              <TableCell>
                {format(new Date(ret.return_date), "dd/MM/yyyy HH:mm")}
              </TableCell>
              <TableCell>{ret.reason}</TableCell>
              <TableCell>
                <ul className="list-disc list-inside">
                  {ret.returnItems.map((item: any) => (
                    <li key={item.id}>
                      {item.goodsDetail.itemCatalog.item_description} (
                      {item.quantity_returned} units - {item.condition})
                    </li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>
                <Badge
                  className={`${statusColors[ret.status as keyof typeof statusColors]} text-white`}
                >
                  {ret.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Select
                  defaultValue={ret.status}
                  onValueChange={(value) => onStatusChange(ret.id, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}