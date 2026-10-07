import { BOOKING_PAYMENT_LABELS, formatBookingMoney, type BookingPaymentStatus } from '@/lib/booking';

export interface BookingReceiptData {
    bility_number: string;
    booking_date: string;
    from_city: string;
    to_city: string;
    sender_name: string;
    receiver_name: string;
    karaya: number;
    station_rent: number;
    bility_expense: number;
    station_labour: number;
    total_amount: number;
    payment_status: BookingPaymentStatus;
    items: { item_name: string; quantity: number }[];
}

function formatReceiptDate(value: string) {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${Number(day)}-${Number(month)}-${year}`;
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function bookingReceiptHtml(data: BookingReceiptData) {
    const payment = BOOKING_PAYMENT_LABELS[data.payment_status];
    const rows = data.items.map((item) => `
        <tr>
            <td>${escapeHtml(item.item_name)}</td>
            <td class="num">${item.quantity}</td>
        </tr>
    `).join('');

    const charge = (label: string, urdu: string, amount: number) => `
        <tr>
            <td>${label}<span>${urdu}</span></td>
            <td class="num">${formatBookingMoney(amount)}</td>
        </tr>
    `;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bilty ${escapeHtml(data.bility_number)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #14301f; background: #fff; }
    .sheet { max-width: 760px; margin: 16px auto; border: 8px solid #1f7a3a; padding: 16px 18px 20px; }
    .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #1f7a3a; padding-bottom: 10px; }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0.5px; }
    .company { font-size: 13px; font-weight: 700; letter-spacing: 0.4px; }
    .phones { margin-top: 4px; font-size: 13px; }
    .meta { text-align: right; }
    .bilty { font-size: 22px; font-weight: 800; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 14px; }
    .field { border-bottom: 1px solid #b7d7c2; padding: 4px 0; }
    .field span { display: block; font-size: 11px; color: #3d6b4c; text-transform: uppercase; letter-spacing: 0.4px; }
    .field strong { font-size: 15px; }
    h2 { margin: 16px 0 6px; font-size: 13px; letter-spacing: 0.6px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #1f7a3a; padding: 6px 8px; font-size: 13px; }
    th { background: #e7f6ec; text-align: left; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .charges { width: 360px; margin-left: auto; margin-top: 12px; }
    .charges span { display: block; font-size: 11px; color: #3d6b4c; }
    .total td { font-weight: 800; font-size: 15px; background: #e7f6ec; }
    .pay { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; }
    .badge { border: 2px solid #1f7a3a; padding: 6px 12px; font-weight: 800; letter-spacing: 0.4px; }
    @media print {
      body { margin: 0; }
      .sheet { margin: 0; border-width: 6px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="company">GOODS TRANSPORT COMPANY</div>
        <h1>Zikria</h1>
        <div class="phones">048-3701451 &nbsp; 048-3701351</div>
        <div class="phones">Sargodha, Pakistan</div>
      </div>
      <div class="meta">
        <div>Bilty number</div>
        <div class="bilty">${escapeHtml(data.bility_number)}</div>
        <div>Date ${formatReceiptDate(data.booking_date)}</div>
      </div>
    </div>
    <div class="grid">
      <div class="field"><span>From</span><strong>${escapeHtml(data.from_city)}</strong></div>
      <div class="field"><span>To</span><strong>${escapeHtml(data.to_city)}</strong></div>
      <div class="field"><span>Sender</span><strong>${escapeHtml(data.sender_name)}</strong></div>
      <div class="field"><span>Receiver</span><strong>${escapeHtml(data.receiver_name)}</strong></div>
    </div>
    <h2>Description</h2>
    <table>
      <thead><tr><th>Item type</th><th class="num">Quantity</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="charges">
      ${charge('Karaya', 'کرایہ', data.karaya)}
      ${charge('Adaa Karaya (Station Rent)', 'اڈا کرایہ', data.station_rent)}
      ${charge('Bility Expense', 'بلٹی خرچہ', data.bility_expense)}
      ${charge('Station Labour', 'اڈا مزدوری', data.station_labour)}
      <tr class="total"><td>Total</td><td class="num">${formatBookingMoney(data.total_amount)}</td></tr>
    </table>
    <div class="pay">
      <div>Payment</div>
      <div class="badge">${escapeHtml(payment)}</div>
    </div>
  </div>
</body>
</html>`;
}

export function printBookingReceipt(data: BookingReceiptData) {
    const printWindow = window.open('', '_blank', 'width=860,height=900');
    if (!printWindow) {
        return false;
    }
    printWindow.document.open();
    printWindow.document.write(bookingReceiptHtml(data));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
        printWindow.print();
    }, 250);
    return true;
}
