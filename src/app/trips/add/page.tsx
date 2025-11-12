// src/app/trips/add/page.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TripShipmentLogSchema = z.object({
  id: z.string().optional(),
  serial_number: z.number().int().min(1),
  bilty_number: z.string().optional().default(''),
  receiver_id: z.number().int().min(1, 'Receiver is required'),
  item_id: z.number().int().min(1, 'Item is required'),
  quantity: z.number().int().min(1),
  delivery_charges: z.number().min(0),
  walk_in_receiver_name: z.string().optional(),
  total_charges: z.number().min(0),
});

const TripLogFormSchema = z.object({
  vehicle_id: z.number().min(1, 'Vehicle is required'),
  driver_name: z.string().optional(),
  driver_mobile: z.string().optional(),
  // MODIFIED: Changed station_name to forwarding_agency_id
  forwarding_agency_id: z.number().int().optional(),
  city_id: z.number().int().min(1, 'City is required'),
  date: z.string().min(1, 'Date is required'),
  total_fare_collected: z.number().min(0),
  // ... (omitted cut fields)
  delivery_cut_percentage: z.number().min(0).max(100),
  delivery_cut: z.number().min(0),
  cuts: z.number().min(0).optional().default(0),
  accountant_charges: z.number().min(0).optional().default(0),
  received_amount: z.number().min(0),
  fare_is_paid: z.boolean().default(false),
  note: z.string().optional(),
  shipmentLogs: z.array(TripShipmentLogSchema).min(1, { message: "You must add at least one shipment log." }),
});

type TripLogFormValues = z.infer<typeof TripLogFormSchema>;

interface DropdownItem {
  id: number;
  name?: string;
  vehicleNumber?: string;
  item_description?: string;
}

interface DropdownData {
  cities: DropdownItem[];
  agencies: DropdownItem[]; // Added for use in the new field
  vehicles: DropdownItem[];
  parties: DropdownItem[];
  items: DropdownItem[];
  shipments: DropdownItem[];
}

interface ShipmentBilty {
  register_number: string;
  bility_number: string;
  receiver_id: number;
  receiver_name: string;
  item_id: number;
  item_description: string;
  quantity: number;
  delivery_charges: number;
  total_charges: number;
}

const today = new Date().toISOString().substring(0, 10);

const generateDefaultValues = (): TripLogFormValues => ({
  vehicle_id: 0,
  driver_name: '',
  driver_mobile: '',
  // MODIFIED: Changed station_name to forwarding_agency_id
  forwarding_agency_id: 0,
  city_id: 0,
  date: today,
  total_fare_collected: 0.00,
  delivery_cut_percentage: 5.0,
  delivery_cut: 0.00,
  cuts: 0.00,
  accountant_charges: 0.00,
  received_amount: 0.00,
  fare_is_paid: false,
  note: '',
  shipmentLogs: [],
});

const findNameById = (data: DropdownData | null, listName: keyof DropdownData, id: number | null | undefined): string => {
  if (!data || !id) return 'N/A';
  const list = data[listName] as DropdownItem[];
  const item = list.find(item => item.id === id);
  if (listName === 'vehicles') return item?.vehicleNumber || 'Unknown Vehicle';
  if (listName === 'items') return item?.item_description || 'Unknown Item';
  return item?.name || 'Unknown';
};

// Percentage options from 4% to 10.5%
const percentageOptions = [
  4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5
];

export default function AddTrip() {
  const [data, setData] = useState<DropdownData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [nextSerialNumber, setNextSerialNumber] = useState(1);

  const form = useForm<TripLogFormValues>({
    resolver: zodResolver(TripLogFormSchema) as any,
    defaultValues: generateDefaultValues(),
    mode: 'onChange',
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "shipmentLogs",
  });

  const watchedVehicleId = form.watch('vehicle_id');
  const watchedDate = form.watch('date');
  const watchedDeliveryCutPercentage = form.watch('delivery_cut_percentage');
  const watchedDeliveryCut = form.watch('delivery_cut');
  const watchedCuts = form.watch('cuts');
  const watchedAccountantCharges = form.watch('accountant_charges');
  const watchedShipmentLogs = form.watch('shipmentLogs');

  // Load initial dropdown data
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const response = await fetch('/api/lists');
        if (!response.ok) throw new Error('Failed to load dependency lists.');
        const lists = await response.json();
        setData(lists);
      } catch (error: any) {
        console.error("Data fetch error:", error);
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchInitialData();
  }, []);

  // Fetch next serial number on mount
  useEffect(() => {
    async function fetchNextSerial() {
      try {
        const response = await fetch('/api/trips/next-serial');
        if (response.ok) {
          const { nextSerial } = await response.json();
          setNextSerialNumber(nextSerial);
        }
      } catch (error) {
        console.error('Error fetching next serial:', error);
      }
    }
    fetchNextSerial();
  }, []);

  // Load shipments when vehicle and date are selected
  useEffect(() => {
    async function loadShipmentsForVehicleAndDate() {
      if (!watchedVehicleId || watchedVehicleId === 0 || !watchedDate) {
        replace([]);
        return;
      }

      setLoadingShipments(true);
      try {
        const response = await fetch(
          `/api/shipments/by-vehicle-date?vehicle_id=${watchedVehicleId}&date=${watchedDate}`
        );
        
        if (!response.ok) throw new Error('Failed to load shipments');
        
        const shipments: ShipmentBilty[] = await response.json();
        
        const mappedLogs = shipments.map((shipment, index) => ({
          id: uuidv4(),
          serial_number: index + 1,
          bilty_number: shipment.bility_number,
          receiver_id: shipment.receiver_id,
          item_id: shipment.item_id,
          quantity: shipment.quantity,
          delivery_charges: shipment.delivery_charges,
          walk_in_receiver_name: shipment.receiver_id === 1 ? shipment.receiver_name : undefined,
          total_charges: shipment.total_charges,
        }));
        
        replace(mappedLogs);
      } catch (error: any) {
        console.error('Error loading shipments:', error);
        replace([]);
      } finally {
        setLoadingShipments(false);
      }
    }

    loadShipmentsForVehicleAndDate();
  }, [watchedVehicleId, watchedDate, replace]);

  // Calculate total fare from shipment logs
  const totalFareFromLogs = useMemo(() => {
    return watchedShipmentLogs.reduce((sum, log) => sum + (Number(log.total_charges) || 0), 0);
  }, [watchedShipmentLogs]);

  // Auto-calculate delivery cut and received amount
  useEffect(() => {
    form.setValue('total_fare_collected', totalFareFromLogs);

    // Calculate delivery cut based on percentage
    const deliveryCut = (totalFareFromLogs * watchedDeliveryCutPercentage) / 100;
    form.setValue('delivery_cut', Number(deliveryCut.toFixed(2)));

    // Use the latest values for delivery_cut, cuts, and accountant_charges
    const delivery_cut = Number(form.getValues('delivery_cut')) || 0;
    const cuts = Number(form.getValues('cuts')) || 0;
    const accountant_charges = Number(form.getValues('accountant_charges')) || 0;

    const calculatedReceivedAmount = totalFareFromLogs - delivery_cut - cuts - accountant_charges;
    form.setValue('received_amount', calculatedReceivedAmount > 0 ? calculatedReceivedAmount : 0);

  }, [totalFareFromLogs, watchedDeliveryCutPercentage, watchedDeliveryCut, watchedCuts, watchedAccountantCharges, form]);

  async function handleDirectSave(values: TripLogFormValues) {
    try {
      // NOTE: We rely on the API to look up the Agency Name from forwarding_agency_id
      const payloadToSend = {
          ...values,
          // Placeholder values for non-input time fields
          arrival_time: '00:00', 
          departure_time: '00:00',
      }
      
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register trip log.');
      }

      alert(`Trip Log #${nextSerialNumber} Registered Successfully 🚀`);
      
      // Increment serial number and reset form
      setNextSerialNumber(prev => prev + 1);
      form.reset(generateDefaultValues());

    } catch (error: any) {
      console.error('Submission Error:', error);
      alert(`Error: ${error.message}`);
    }
  }

  if (isLoadingData) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
    <div className='text-4xl font-extrabold text-blue-600 flex space-x-1'>
        {/* We apply the bounce animation to each letter, 
            using arbitrary values for 'animation-delay' to stagger them.
        */}
        <span className="animate-bounce [animation-delay:-0.45s]">Z</span>
        <span className="animate-bounce [animation-delay:-0.30s]">G</span>
        <span className="animate-bounce [animation-delay:-0.15s]">T</span>
        <span className="animate-bounce">C</span>
    </div>
</div>
    );
  }

  return (
    <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
      <div className="flex justify-between items-center mb-6">
        <h2 className='text-3xl font-bold text-gray-800 border-b pb-2'>New Trip Log</h2>
        <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
          <span className="text-sm font-medium">Serial Number:</span>
          <span className="text-2xl font-bold ml-2">#{nextSerialNumber}</span>
        </div>
      </div>
      
      <Form {...form}>
        <div className='space-y-8 p-8 rounded-lg shadow-md border bg-white'>
          {/* Vehicle and Driver Details */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <FormField control={form.control} name='vehicle_id' render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Number *</FormLabel>
                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Vehicle" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {data?.vehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                        {vehicle.vehicleNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='driver_name' render={({ field }) => (
              <FormItem>
                <FormLabel>Driver Name</FormLabel>
                <FormControl>
                  <Input placeholder='Driver Name' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='driver_mobile' render={({ field }) => (
              <FormItem>
                <FormLabel>Driver Mobile</FormLabel>
                <FormControl>
                  <Input placeholder='0300-1234567' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {/* MODIFIED: Replaced original station_name input with forwarding_agency_id dropdown */}
            <FormField control={form.control} name='forwarding_agency_id' render={({ field }) => (
              <FormItem>
                <FormLabel>Forwarding Agency (Station)</FormLabel>
                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Agency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {data?.agencies?.map((agency) => (
                      <SelectItem key={agency.id} value={String(agency.id)}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Location and Time */}
          {/* Fields adjusted to only include City and Date */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField control={form.control} name='city_id' render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {data?.cities?.map((city) => (
                      <SelectItem key={city.id} value={String(city.id)}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='date' render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Shipment Logs Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className='text-lg font-semibold'>Shipment Details (Bilty Cart)</h3>
              {loadingShipments && <span className="text-blue-600 text-sm">Loading shipments...</span>}
            </div>
            
            {fields.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-center">
                <p className="text-yellow-800">Please select a vehicle and date to load shipment details.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Sr. #</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Bilty #</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Receiver</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Item Details</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Qty</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Total Charges (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">{form.watch(`shipmentLogs.${index}.serial_number`)}</td>
                        <td className="border border-gray-300 px-4 py-2 font-mono">{form.watch(`shipmentLogs.${index}.bilty_number`)}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {form.watch(`shipmentLogs.${index}.receiver_id`) === 1 
                            ? form.watch(`shipmentLogs.${index}.walk_in_receiver_name`) || 'Walk-in'
                            : findNameById(data, 'parties', form.watch(`shipmentLogs.${index}.receiver_id`))}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">{findNameById(data, 'items', form.watch(`shipmentLogs.${index}.item_id`))}</td>
                        <td className="border border-gray-300 px-4 py-2">{form.watch(`shipmentLogs.${index}.quantity`)}</td>
                        <td className="border border-gray-300 px-4 py-2 font-semibold">{Number(form.watch(`shipmentLogs.${index}.total_charges`)).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={5} className="border border-gray-300 px-4 py-2 text-right">Total Fare Collected:</td>
                      <td className="border border-gray-300 px-4 py-2">Rs. {totalFareFromLogs.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <FormMessage>{form.formState.errors.shipmentLogs?.root?.message || form.formState.errors.shipmentLogs?.message}</FormMessage>
          </div>

          {/* Financial Details */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <FormField control={form.control} name='total_fare_collected' render={({ field }) => (
              <FormItem>
                <FormLabel>Total Fare Collected</FormLabel>
                <FormControl>
                  <Input type='number' {...field} value={field.value.toFixed(0)} readOnly className="bg-gray-100 font-bold" />
                </FormControl>
              </FormItem>
            )} />
            
            <FormField control={form.control} name='delivery_cut_percentage' render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery %</FormLabel>
                <Select onValueChange={(val) => field.onChange(parseFloat(val))} value={String(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select %" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {percentageOptions.map(percent => (
                      <SelectItem key={percent} value={String(percent)}>
                        {percent}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name='delivery_cut' render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Amount</FormLabel>
                <FormControl>
                  <Input type='number' {...field} value={field.value.toFixed(0)} readOnly className="bg-blue-50 font-semibold" />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name='cuts' render={({ field }) => (
              <FormItem>
                <FormLabel>Other</FormLabel>
                <FormControl>
                  <Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name='accountant_charges' render={({ field }) => (
              <FormItem>
                <FormLabel>Munshiana Charges</FormLabel>
                <FormControl>
                  <Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
              </FormItem>
            )} />
          </div>

          {/* Fare Payment Status & Final Amount */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 items-end'>
            <FormField control={form.control} name='note' render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea placeholder='Additional notes...' {...field} rows={3} />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name='fare_is_paid' render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-gray-50">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-base font-semibold cursor-pointer">
                    Fare is Paid
                  </FormLabel>
                  <FormDescription>
                    Check if the fare has been paid
                  </FormDescription>
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name='received_amount' render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-bold">Final Payable Amount</FormLabel>
                <FormControl>
                  <Input type='number' {...field} value={field.value.toFixed(0)} readOnly className="bg-green-100 text-green-800 text-xl font-bold" />
                </FormControl>
              </FormItem>
            )} />
          </div>

          <Button 
            type='button' 
            onClick={form.handleSubmit(handleDirectSave)}
            className='w-full text-lg' 
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save Trip Log'}
          </Button>
        </div>
      </Form>
    </div>
  );
}