# TODO: Create Trip Log Add Page

## Steps to Complete

1. **Create API Route for Trips** (`src/app/api/trips/route.ts`)
   - Implement GET to fetch existing trip logs (optional for now).
   - Implement POST to create new TripLog and associated TripShipmentLogs.
   - Handle validation and database transactions.

2. **Update API Lists Route** (`src/app/api/lists/route.ts`)
   - Add shipments list to include bility_number for selection in cart.

3. **Create Add Trip Page** (`src/app/trips/add/page.tsx`)
   - Set up React Hook Form with Zod schema for TripLog and TripShipmentLog array.
   - Implement form sections: Vehicle/Driver, Location/Time, Cart (dynamic), Financial, Note.
   - Use Shadcn UI components for inputs, selects, tables.
   - Fetch dropdown data from /api/lists.
   - Handle form submission to /api/trips API.
   - Add success/error toasts.

4. **Test the Implementation**
   - Run the development server and navigate to /trips/add.
   - Fill out the form and submit to verify API and database integration.
   - Check for any UI/UX issues or validation errors.

5. **Optional: Update Navigation**
   - Add trips link to sidebar or main navigation if needed.
