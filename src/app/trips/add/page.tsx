// components/AddTrip.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock toast hook to match your setup
export function useToast() {
  return {
    toast: {
      success: (toast: { title?: string, description?: string }) => {
        sonnerToast.success(toast.title, { description: toast.description });
      },
      error: (toast: { title?: string, description?: string }) => {
        sonnerToast.error(toast.title, { description: toast.description });
      },
    },
  };
}

const TripShipmentLogSchema = z.object({
  id: z.string().optional(),
  serial_number: z.number().int().min(1),
  bilty_number: z.string().optional().default(''),
  receiver_id: z.number().int().min(1, 'Receiver is required'),
  item_id: z.number().int().min(1, 'Item is required'),
  quantity: z.number().int().min(1),
  delivery_charges: z.number().min(0),
  walk_in_receiver_name: z.string().optional(),
});

const TripLogFormSchema = z.object({
  vehicle_id: z.number().min(1, 'Vehicle is required'),
  driver_name: z.string().min(1, 'Driver name is required'),
  driver_mobile: z.string().min(1, 'Driver mobile is required'),
  station_name: z.string().min(1, 'Station name is required'),
  city_id: z.number().int().min(1, 'City is required'),
  date: z.string().min(1, 'Date is required'),
  arrival_time: z.string().min(1, 'Arrival time is required'),
  departure_time: z.string().min(1, 'Departure time is required'),
  total_fare_collected: z.number().min(0),
  delivery_cut: z.number().min(0),
  commission: z.number().min(0),
  arrears: z.number().min(0),
  cuts: z.number().min(0).optional().default(0),
  munsihna_reward: z.number().min(0).optional().default(0),
  distant_charges: z.number().min(0).optional().default(0),
  accountant_charges: z.number().min(0).optional().default(0),
  received_amount: z.number().min(0),
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
  agencies: DropdownItem[];
  vehicles: DropdownItem[];
  parties: DropdownItem[];
  items: DropdownItem[];
  shipments: DropdownItem[];
}

const today = new Date().toISOString().substring(0, 10);

const generateDefaultValues = (): TripLogFormValues => ({
  vehicle_id: 0,
  driver_name: '',
  driver_mobile: '',
  station_name: '',
  city_id: 0,
  date: today,
  arrival_time: '',
  departure_time: '',
  total_fare_collected: 0.00,
  delivery_cut: 0.00,
  commission: 0.00,
  arrears: 0.00,
  cuts: 0.00,
  munsihna_reward: 0.00,
  distant_charges: 0.00,
  accountant_charges: 0.00,
  received_amount: 0.00,
  note: '',
  shipmentLogs: [
    { id: uuidv4(), serial_number: 1, bilty_number: '', receiver_id: 0, item_id: 0, quantity: 1, delivery_charges: 0.00 }
  ],
});

const findNameById = (data: DropdownData | null, listName: keyof DropdownData, id: number | null | undefined): string => {
  if (!data || !id) return 'N/A';
  const list = data[listName] as DropdownItem[];
  const item = list.find(item => item.id === id);
  if (listName === 'vehicles') return item?.vehicleNumber || 'Unknown Vehicle';
  return item?.name || 'Unknown';
};

export default function AddTrip() {
  const { toast } = useToast();
  const [data, setData] = useState<DropdownData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<TripLogFormValues>({
    resolver: zodResolver(TripLogFormSchema) as any,
    defaultValues: generateDefaultValues(),
    mode: 'onChange', // Validate on change to enable submit button
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "shipmentLogs",
  });

  const watchedFinancialFields = form.watch([
    'delivery_cut',
    'commission',
    'arrears',
    'cuts',
    'munsihna_reward',
    'distant_charges',
    'accountant_charges'
  ]);
  const watchedShipmentLogs = form.watch('shipmentLogs');

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const response = await fetch('/api/lists');
        if (!response.ok) throw new Error('Failed to load dependency lists.');
        const lists = await response.json();
        setData(lists);
      } catch (error: any) {
        console.error("Data fetch error:", error);
        toast.error({ title: 'Error Loading Data', description: error.message || 'Could not fetch lists.' });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchInitialData();
  }, []);

  const addShipmentLog = () => {
    const shipmentLogs = form.getValues('shipmentLogs');
    const nextSerial = shipmentLogs.length > 0 ? Math.max(...shipmentLogs.map(s => s.serial_number)) + 1 : 1;
    append({ id: uuidv4(), serial_number: nextSerial, bilty_number: '', receiver_id: 0, item_id: 0, quantity: 1, delivery_charges: 0.00 });
  };

  const totalFareFromLogs = useMemo(() => {
    return watchedShipmentLogs.reduce((sum, log) => sum + (Number(log.delivery_charges) || 0), 0);
  }, [watchedShipmentLogs]);

  useEffect(() => {
    form.setValue('total_fare_collected', totalFareFromLogs);

    const [
      delivery_cut, commission, arrears, cuts, munsihna_reward, distant_charges, accountant_charges
    ] = watchedFinancialFields.map(val => Number(val) || 0);

    const calculatedReceivedAmount = totalFareFromLogs
        - delivery_cut
        - commission
        - arrears
        - cuts
        - munsihna_reward
        - distant_charges
        - accountant_charges;

    form.setValue('received_amount', calculatedReceivedAmount > 0 ? calculatedReceivedAmount : 0);

  }, [totalFareFromLogs, watchedFinancialFields, form]);

  async function handleDirectSave(values: TripLogFormValues) {
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register trip log.');
      }

      toast.success({
        title: 'Trip Log Registered Successfully 🚀',
        description: `Trip for vehicle ${findNameById(data, 'vehicles', values.vehicle_id)} saved.`
      });

      form.reset(generateDefaultValues());

    } catch (error: any) {
      console.error('Submission Error:', error);
      toast.error({ title: 'Error Registering Trip Log ⚠️', description: error.message });
    }
  }

  if (isLoadingData) {
    return (
      <div className='p-6 max-w-4xl mx-auto text-center'>
        <p className="text-xl">Loading form data...</p>
      </div>
    );
  }

  return (
    <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>New Trip Log</h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleDirectSave)}
          className='space-y-8 p-8 rounded-lg shadow-md border bg-white'
        >
          {/* Vehicle and Driver Details */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <FormField control={form.control} name='vehicle_id' render={({ field }) => (
              <FormItem><FormLabel>Vehicle Number</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''}><FormControl><SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger></FormControl><SelectContent>{data?.vehicles.map(vehicle => (<SelectItem key={vehicle.id} value={String(vehicle.id)}>{vehicle.vehicleNumber}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='driver_name' render={({ field }) => (
              <FormItem><FormLabel>Driver Name</FormLabel><FormControl><Input placeholder='Driver Name' {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='driver_mobile' render={({ field }) => (
              <FormItem><FormLabel>Driver Mobile</FormLabel><FormControl><Input placeholder='0300-1234567' {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='station_name' render={({ field }) => (
              <FormItem><FormLabel>Station Name</FormLabel><FormControl><Input placeholder='Station Name' {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          {/* Location and Time */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
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
              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type='date' {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='arrival_time' render={({ field }) => (
              <FormItem><FormLabel>Arrival Time</FormLabel><FormControl><Input type='time' {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='departure_time' render={({ field }) => (
              <FormItem><FormLabel>Departure Time</FormLabel><FormControl><Input type='time' {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          {/* Shipment Logs Table */}
          <div>
            <h3 className='text-lg font-semibold mb-2'>Shipment Logs</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Sr. #</TableHead><TableHead>Bilty #</TableHead><TableHead>Receiver</TableHead><TableHead>Item Details</TableHead><TableHead>Qty</TableHead><TableHead>Charges</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell><Input type='number' {...form.register(`shipmentLogs.${index}.serial_number`, { valueAsNumber: true })} /></TableCell>
                    <TableCell><Input placeholder='Bilty Number' {...form.register(`shipmentLogs.${index}.bilty_number`)} /></TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`shipmentLogs.${index}.receiver_id` as const}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Receiver" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {data?.parties?.map((party) => (
                                  <SelectItem key={party.id} value={String(party.id)}>
                                    {party.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    {/* Walk-in receiver name input (id === 1) */}
                    {form.watch(`shipmentLogs.${index}.receiver_id`) === 1 && (
                      <TableCell colSpan={1}>
                        <FormItem>
                          <FormLabel>Walk-in Receiver Name</FormLabel>
                          <FormControl>
                            <Input placeholder='Enter receiver name' {...form.register(`shipmentLogs.${index}.walk_in_receiver_name` as const)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </TableCell>
                    )}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`shipmentLogs.${index}.item_id` as const}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {data?.items?.map((item) => (
                                  <SelectItem key={item.id} value={String(item.id)}>
                                    {item.item_description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell><Input type='number' {...form.register(`shipmentLogs.${index}.quantity`, { valueAsNumber: true })} /></TableCell>
                    <TableCell><Input type='number' step='0.01' {...form.register(`shipmentLogs.${index}.delivery_charges`, { valueAsNumber: true })} /></TableCell>
                    <TableCell><Button type='button' variant='destructive' size="sm" onClick={() => remove(index)}>X</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type='button' onClick={addShipmentLog} className='mt-4' variant="outline">Add Shipment</Button>
            <FormMessage>{form.formState.errors.shipmentLogs?.root?.message || form.formState.errors.shipmentLogs?.message}</FormMessage>
          </div>

          {/* Financial Details */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <FormField control={form.control} name='total_fare_collected' render={({ field }) => (<FormItem><FormLabel>Total Delivery Charges</FormLabel><FormControl><Input type='number' {...field} readOnly className="bg-gray-100" /></FormControl></FormItem>)} />
            <FormField control={form.control} name='delivery_cut' render={({ field }) => (<FormItem><FormLabel>Delivery</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
            <FormField control={form.control} name='commission' render={({ field }) => (<FormItem><FormLabel>Commission</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
            <FormField control={form.control} name='arrears' render={({ field }) => (<FormItem><FormLabel>Arrears</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
            <FormField control={form.control} name='cuts' render={({ field }) => (<FormItem><FormLabel>Cuts</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
            <FormField control={form.control} name='munsihna_reward' render={({ field }) => (<FormItem><FormLabel>Reward</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
            <FormField control={form.control} name='distant_charges' render={({ field }) => (<FormItem><FormLabel>Distant Charges</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
            <FormField control={form.control} name='accountant_charges' render={({ field }) => (<FormItem><FormLabel>Munsihna Charges</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
          </div>
            
          {/* Final Amount & Note */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 items-end'>
            <FormField control={form.control} name='note' render={({ field }) => (<FormItem><FormLabel>Note</FormLabel><FormControl><Textarea placeholder='Additional notes...' {...field} rows={3} /></FormControl></FormItem>)} />
            <FormField control={form.control} name='received_amount' render={({ field }) => (<FormItem><FormLabel className="text-lg font-bold">Final Received Amount</FormLabel><FormControl><Input type='number' {...field} readOnly className="bg-green-100 text-green-800 text-xl font-bold" /></FormControl></FormItem>)} />
          </div>

          <Button type='submit' className='w-full text-lg' disabled={form.formState.isSubmitting || !form.formState.isValid}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Trip Log'}
          </Button>
        </form>
      </Form>
    </div>
  );
}