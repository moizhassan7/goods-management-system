import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

// Helper type for the item data structure in the form, using record for dynamic keys
type ItemFormValues = Record<
  number,
  {
    quantity_returned: number;
    condition: string;
  }
>;

// Zod schema for the final data structure to be sent to the API
const returnFormSchema = z.object({
  original_shipment_id: z.string().min(1, "Shipment ID is required"),
  reason: z.string().min(1, "Return reason is required"),
  action_taken: z.string().optional(),
  comments: z.string().optional(),
  // Items will be transformed before submission
  items: z.record(z.string().or(z.number()), z.object({
    quantity_returned: z.number().min(1, "Quantity must be at least 1"),
    condition: z.string().min(1, "Item condition is required")
  })),
});

// Zod schema for the final API payload structure
const apiReturnItemSchema = z.object({
  goods_detail_id: z.number(),
  quantity_returned: z.number(),
  condition: z.string(),
});

type ApiReturnItem = z.infer<typeof apiReturnItemSchema>;

// Type for the form values before transformation
type ReturnFormInputValues = z.infer<typeof returnFormSchema>;

// Type for the transformed values to be submitted
type ReturnFormOutputValues = Omit<ReturnFormInputValues, 'items'> & {
  items: ApiReturnItem[];
};

interface ItemCatalog {
  id: number;
  item_description: string;
}

interface GoodsDetails {
  good_detail_id: number;
  quantity: number;
  itemCatalog: ItemCatalog;
}

interface Shipment {
  register_number: string;
  goodsDetails: GoodsDetails[];
}

interface ReturnFormProps {
  shipment: Shipment;
  onSubmit: (values: ReturnFormOutputValues) => void;
}

export function ReturnForm({ shipment, onSubmit }: ReturnFormProps) {
  const defaultItems = shipment.goodsDetails.reduce((acc, item) => {
    acc[item.good_detail_id] = {
      quantity_returned: 0,
      condition: ""
    };
    return acc;
  }, {} as ItemFormValues);

  const form = useForm<ReturnFormInputValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      original_shipment_id: shipment.register_number,
      reason: "",
      action_taken: "",
      comments: "",
      items: defaultItems,
    },
  });

  const conditions = [
    "DAMAGED",
    "WRONG_ITEM",
    "INCOMPLETE",
    "NOT_AS_DESCRIBED",
    "OTHER",
  ];

  const handleFormSubmit = (values: ReturnFormInputValues) => {
    // Transform the items object into the required array structure
    const returnedItems = Object.entries(values.items)
      .map(([id, item]) => ({
        goods_detail_id: parseInt(id), // Convert the dynamic key back to number
        quantity_returned: item.quantity_returned,
        condition: item.condition,
      }))
      // Filter out items where quantity is 0 or less, meaning the user didn't select them
      .filter(item => item.quantity_returned > 0); 
      
    if (returnedItems.length === 0) {
        form.setError("root.items", { message: "Please specify at least one item to return." });
        return;
    }

    const outputValues: ReturnFormOutputValues = {
        original_shipment_id: values.original_shipment_id,
        reason: values.reason,
        action_taken: values.action_taken,
        comments: values.comments,
        items: returnedItems
    }

    onSubmit(outputValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Return Reason</FormLabel>
              <FormControl>
                <Input placeholder="Enter return reason" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="action_taken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action Taken (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter action taken" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter comments" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Items in Shipment</h3>
          {/* Custom error message for items array */}
          {form.formState.errors.root?.items && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.root.items.message}
              </p>
          )}
          
          {shipment.goodsDetails.map((item) => (
            <div
              key={item.good_detail_id}
              className="p-4 border rounded-md space-y-4"
            >
              <p className="font-medium">
                {item.itemCatalog.item_description} (Max: {item.quantity})
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity Field */}
                <FormField
                  control={form.control}
                  name={`items.${item.good_detail_id}.quantity_returned`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity to Return</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0} // Allow 0 to be easily ignored on submit
                          max={item.quantity}
                          placeholder={`Max ${item.quantity}`}
                          // Convert value to number for validation
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          value={field.value.toString()} // Pass value as string to Input
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Condition Field */}
                <FormField
                  control={form.control}
                  name={`items.${item.good_detail_id}.condition`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Return Conditions</SelectLabel>
                            {conditions.map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                {condition.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create Return"}
        </Button>
      </form>
    </Form>
  );
}