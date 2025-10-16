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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReturnForm } from "@/components/forms/ReturnForm";
import { Input } from "@/components/ui/input";

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentId, setShipmentId] = useState("");
  const [isLoadingShipment, setIsLoadingShipment] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await fetch("/api/returns");
      if (!response.ok) throw new Error("Failed to fetch returns");
      const data = await response.json();
      setReturns(data);
    } catch (error: any) {
      toast.error("Error", {
        description: error.message
      });
    };
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const response = await fetch("/api/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) throw new Error("Failed to update return status");
      
      toast.success("Success", {
        description: "Return status updated successfully"
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
      toast.error("Error", {
        description: "Please enter a shipment ID"
      });
      return;
    }

    setIsLoadingShipment(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`); // This calls your backend API
      if (!response.ok) throw new Error("Shipment not found");
      const data = await response.json();
      setSelectedShipment(data);
      toast.success("Success", {
        description: "Shipment found"
      });
    } catch (error: any) {
      toast.error("Error", {
        description: error.message
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

      if (!response.ok) throw new Error("Failed to create return");
      
      toast.success("Success", {
        description: "Return created successfully"
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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Returns Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Return</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Return</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!selectedShipment ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter shipment ID"
                    value={shipmentId}
                    onChange={(e) => setShipmentId(e.target.value)}
                  />
                  <Button onClick={lookupShipment} disabled={isLoadingShipment}>
                    {isLoadingShipment ? "Looking up..." : "Look up"}
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

      <ReturnList returns={returns} onStatusChange={handleStatusChange} />
    </div>
  );
}