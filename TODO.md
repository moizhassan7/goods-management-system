# TODO: Make driver name, driver mobile, and forwarding agency optional in trips add page, and change shipment filter from bility_date to created_at

## Tasks
- [x] Update TripLogFormSchema in src/app/trips/add/page.tsx to make driver_name, driver_mobile, and forwarding_agency_id optional
- [x] Modify API in src/app/api/shipments/by-vehicle-date/route.ts to filter shipments by created_at using date range instead of bility_date
- [ ] Test the form to ensure optional fields allow submission without values
- [ ] Test the API to verify shipments load based on created_at date instead of bility_date
