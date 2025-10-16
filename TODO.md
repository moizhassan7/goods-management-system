# TODO: Update Add Trip Page to Show Total Charges and Item Name ID

## Tasks
- [ ] Update API `/api/shipments/by-vehicle-date/route.ts` to include `total_charges` from shipment in response.
- [ ] Update interface `ShipmentBilty` in `src/app/trips/add/page.tsx` to include `total_charges`.
- [ ] Update table in `src/app/trips/add/page.tsx`: Change "Item Details" column to show `item_id` (item_name_id), add new "Total Charges" column showing `total_charges`.
- [ ] Test the changes to ensure data displays correctly in the UI.
