# TODO: Create Reporting Pages for All Modules

## Overview
Create reporting pages for each module in the goods management system. Each module will have a report page at `src/app/{module}/report/page.tsx`, similar to the existing trips report but with module-specific filters and data display.

## Modules to Create Reports For
- [x] Agency
- [x] Cities
- [x] Deliveries
- [x] Items
- [x] Labour-Assignments
- [x] Labour-Persons
- [x] Parties
- [x] Returns
- [x] Shipments
- [x] Vehicles

## General Structure for Each Report Page
- Client-side React component
- Filters: Module-specific (e.g., date range, IDs)
- Fetch data from `/api/{module}` with query params
- Display data in tables/cards with totals if applicable
- Handle loading and no data states

## Specific Plans for Each Module

### Agency Report
- Filters: Date range (createdAt)
- Display: Agency name, number of shipments, total charges
- API: /api/agencies (extend if needed for reports)

### Cities Report
- Filters: None or date range
- Display: City name, departing shipments count, arriving shipments count
- API: /api/cities

### Deliveries Report
- Filters: Date range, shipment_id
- Display: Delivery details, expenses, receiver info
- API: /api/deliveries (already has GET with shipment_id)

### Items Report
- Filters: Date range (createdAt)
- Display: Item description, total quantity shipped, total charges
- API: /api/items

### Labour-Assignments Report
- Filters: Date range, status
- Display: Labour person, shipment, status, amounts
- API: /api/labour-assignments

### Labour-Persons Report
- Filters: Date range
- Display: Labour person details, assignments count, total collected
- API: /api/labour-persons

### Parties Report
- Filters: Date range
- Display: Party name, balance, shipments sent/received, total transactions
- API: /api/parties

### Returns Report
- Filters: Date range, status
- Display: Return details, original shipment, reason, status
- API: /api/returns

### Shipments Report
- Filters: Date range, departure city, to city, vehicle
- Display: Shipment details, charges, goods
- API: /api/shipments (extend with filters)

### Vehicles Report
- Filters: Date range
- Display: Vehicle number, shipments count, total fares, transactions
- API: /api/vehicles

## Next Steps
- Create API endpoints for reports if needed (e.g., /api/{module}/report)
- Test each page for functionality
- Ensure APIs support the required filters (create new endpoints if needed)
