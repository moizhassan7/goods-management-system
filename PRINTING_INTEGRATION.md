# Shipment Printing System Integration Guide

## Overview
The shipment printing system has been successfully integrated with the AddShipment page. Users can now save shipments and immediately access printing options.

## Components Created/Modified

### 1. **ShipmentPrintForm Component** 
**File:** `src/components/forms/ShipmentPrintForm.tsx`

Features:
- Three action buttons: Save, Save & Print, Print Only
- Professional receipt-style layout
- Responsive design for mobile and desktop
- Print-optimized styling

### 2. **Shipment Printing Page**
**File:** `src/app/shipments/printing/page.tsx`

Features:
- Receives shipment data from AddShipment page via sessionStorage
- Displays the ShipmentPrintForm component
- Navigation back to AddShipment if no data available
- Auto-loads data from previous page

### 3. **AddShipment Page** (MODIFIED)
**File:** `src/app/shipments/add/page.tsx`

Changes Made:
- Added `useRouter` import from next/navigation
- Added state variables:
  - `lastSavedShipment`: Stores the most recently saved shipment data
  - `showPrintOptions`: Controls the display of print options dialog
- Modified `handleDirectSave()` function to:
  - Prepare printable data with formatted information
  - Store the data in state
  - Display print options dialog
  - Use sessionStorage to pass data to printing page
- Added print handler functions:
  - `handlePrintOnly()`: Prints using browser's print dialog
  - `handleSaveAndPrint()`: Saves and prints
  - `handleGoToDetailedPrint()`: Redirects to detailed print page
  - `createPrintContent()`: Generates HTML for printing
- Added print options dialog that appears after successful save

## User Flow

### Flow 1: Quick Print
1. User fills out shipment form in AddShipment page
2. Clicks "Save" button
3. Shipment saves to database
4. Print options dialog appears
5. User clicks "Print Now"
6. Browser print dialog opens
7. User can print, save as PDF, or cancel

### Flow 2: Detailed Print Page
1. User fills out shipment form in AddShipment page
2. Clicks "Save" button
3. Shipment saves to database
4. Print options dialog appears
5. User clicks "Detailed Print Page"
6. Redirects to `/shipments/printing`
7. Professional print layout displayed
8. User can use Save, Save & Print, or Print Only buttons

### Flow 3: Continue Entering
1. User fills out shipment form
2. Clicks "Save" button
3. Shipment saves to database
4. Print options dialog appears
5. User clicks "Close"
6. Returns to AddShipment form
7. Form is reset for new entry

## Key Features

✅ **Automatic Data Preparation**
- Formats currency values (PKR)
- Converts database IDs to readable names
- Handles walk-in customer names
- Calculates totals and expenses

✅ **Multiple Print Options**
- Quick print from dialog
- Detailed print page for better formatting
- Browser's native print dialog support
- Print to PDF functionality

✅ **Professional Receipt Format**
- Clear section organization
- Color-coded sections (Financial, Expense)
- Currency formatting
- Print timestamps
- Company branding

✅ **Responsive Design**
- Mobile-friendly dialogs
- Adaptive button layouts
- Print-optimized CSS

## Data Passed to Print Page

```typescript
interface PrintableShipmentData {
    register_number: string;
    bility_number: string;
    bility_date: string;
    departure_city: string;
    forwarding_agency: string;
    vehicle_number: string;
    sender_name: string;
    receiver_name: string;
    destination_city: string;
    item_type: string;
    quantity: number;
    total_delivery_charges: number;
    total_amount: number;
    payment_status: string;
    remarks?: string;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
}
```

## How It Works

### Session Storage Integration
- When user clicks "Detailed Print Page", shipment data is stored in `sessionStorage`
- The printing page checks sessionStorage on mount
- Data is retrieved and parsed
- sessionStorage is cleared after use to prevent stale data

### Print Content Generation
- Dynamic HTML generation in `createPrintContent()` function
- Includes all shipment details
- Professional styling with tables and sections
- Currency formatting using Intl.NumberFormat with PKR locale

### Print Dialog Integration
- Uses browser's native window.open() for print
- Generates HTML document on the fly
- Triggers print dialog with window.print()

## Testing

To test the integration:

1. Navigate to `http://localhost:3000/shipments/add`
2. Fill in all required fields:
   - Bility Number
   - Bility Date
   - Departure City
   - Forwarding Agency
   - Vehicle Number
   - Sender & Receiver
   - Item Type & Quantity
   - Total Amount
3. Click "Save" button
4. Print options dialog should appear
5. Test all three options:
   - **Print Now**: Opens print dialog
   - **Detailed Print Page**: Redirects to printing page
   - **Close**: Closes dialog and resets form

## Files Modified/Created

- ✅ Created: `src/components/forms/ShipmentPrintForm.tsx`
- ✅ Created: `src/app/shipments/printing/page.tsx`
- ✅ Modified: `src/app/shipments/add/page.tsx`

## Notes

- All data is formatted based on the database information
- Currency is displayed in PKR format
- Walk-in customers are handled specially
- Print styling is optimized for both screen and paper
- sessionStorage is used for temporary data transfer (survives page reload during session)
