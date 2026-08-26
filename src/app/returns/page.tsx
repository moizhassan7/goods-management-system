"use client";

import { useEffect, useState } from "react";
import { ReturnList } from "@/components/returns/ReturnList";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReturnForm } from "@/components/forms/ReturnForm";
import { Input } from "@/components/ui/input";
import { RotateCcw, Plus, Search, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentId, setShipmentId] = useState("");
  const [isLoadingShipment, setIsLoadingShipment] = useState(false);
  const [isLoadingReturns, setIsLoadingReturns] = useState(true);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setIsLoadingReturns(true);
    try {
      const response = await fetch("/api/returns");
      if (!response.ok) throw new Error("Failed to fetch returns");
      const data = await response.json();
      setReturns(data);
    } catch (error: any) {
      toast.error("Error", {
        description: error.message
      });
    } finally {
      setIsLoadingReturns(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const response = await fetch("/api/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) throw new Error("Failed to update return status");
      
      toast.success("Status Updated", {
        description: "Return order status updated."
      });
      
      fetchReturns();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message
      });
    }
  };

  const lookupShipment = async () => {
    if (!shipmentId.trim()) {
      toast.error("Lookup Error", {
        description: "Please enter a shipment ID or register number."
      });
      return;
    }

    setIsLoadingShipment(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`);
      if (!response.ok) throw new Error("Shipment not found");
      const data = await response.json();
      setSelectedShipment(data);
      toast.success("Shipment Found", {
        description: `Loaded details for Bilty #${data.bility_number}`
      });
    } catch (error: any) {
      toast.error("Lookup Error", {
        description: error.message || "Shipment could not be found."
      });
    } finally {
      setIsLoadingShipment(false);
    }
  };

  const handleCreateReturn = async (values: any) => {
    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to create return record");
      
      toast.success("Return Created", {
        description: "Cargo return recorded successfully."
      });
      
      setIsDialogOpen(false);
      setSelectedShipment(null);
      setShipmentId("");
      fetchReturns();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message
      });
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Returns & Reverse Logistics Desk
            </h2>
            <p className="text-xs text-slate-500">
              Manage returned cargo packages, damaged item logs, and replacement records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchReturns}
            disabled={isLoadingReturns}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-semibold gap-1 h-8 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReturns ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            onClick={() => {
              setSelectedShipment(null);
              setShipmentId("");
              setIsDialogOpen(true);
            }}
            size="sm"
            className="rounded-lg text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white h-8 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Return
          </Button>
        </div>
      </div>

      {/* Return Log Table */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Processed Return Orders ({returns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ReturnList returns={returns} onStatusChange={handleStatusChange} />
        </CardContent>
      </Card>

      {/* Create Return Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Register Cargo Return
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Lookup the original bilty register number to select returned item quantities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {!selectedShipment ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter original shipment ID or Bilty #"
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  className="rounded-lg h-9 text-xs font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && lookupShipment()}
                />
                <Button 
                  onClick={lookupShipment} 
                  disabled={isLoadingShipment}
                  className="rounded-lg h-9 px-3 font-bold text-xs bg-blue-600 hover:bg-blue-700"
                >
                  {isLoadingShipment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lookup"}
                </Button>
              </div>
            ) : (
              <ReturnForm
                shipment={selectedShipment}
                onSubmit={handleCreateReturn}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}