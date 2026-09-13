import { prisma } from '@/lib/prisma';

export type MasterDataType = 'city' | 'agency' | 'vehicle' | 'party' | 'item' | 'labour-person';

export interface DependencyItem {
  id: string | number;
  primaryText: string;
  secondaryText: string;
  badge?: string;
  link?: string;
}

export interface DependencyCategory {
  title: string;
  count: number;
  items: DependencyItem[];
}

export interface DependencyCheckResult {
  canDelete: boolean;
  totalCount: number;
  entityName: string;
  notFound?: boolean;
  categories: DependencyCategory[];
}

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return String(date);
  }
};

const formatCurrency = (amount: any): string => {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export async function checkMasterDataDependencies(
  type: MasterDataType,
  id: number
): Promise<DependencyCheckResult> {
  const categories: DependencyCategory[] = [];
  let entityName = '';
  let notFound = false;

  switch (type) {
    case 'city': {
      const city = await prisma.city.findUnique({
        where: { id },
        select: { name: true },
      });

      if (!city) {
        return { canDelete: false, totalCount: 0, entityName: '', notFound: true, categories: [] };
      }
      entityName = city.name;

      // 1. Departing Shipments
      const departingCount = await prisma.shipment.count({
        where: { departure_city_id: id },
      });
      if (departingCount > 0) {
        const sampleDeparting = await prisma.shipment.findMany({
          where: { departure_city_id: id },
          select: {
            register_number: true,
            bility_number: true,
            bility_date: true,
            total_charges: true,
          },
          orderBy: { bility_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Shipments (Departure City)',
          count: departingCount,
          items: sampleDeparting.map((s) => ({
            id: s.register_number,
            primaryText: `Bilty #${s.bility_number}`,
            secondaryText: `Register #${s.register_number} • ${formatDate(s.bility_date)} • ${formatCurrency(s.total_charges)}`,
            badge: 'Departure',
            link: `/shipments/view?search=${encodeURIComponent(s.bility_number)}`,
          })),
        });
      }

      // 2. Arriving Shipments
      const arrivingCount = await prisma.shipment.count({
        where: { to_city_id: id },
      });
      if (arrivingCount > 0) {
        const sampleArriving = await prisma.shipment.findMany({
          where: { to_city_id: id },
          select: {
            register_number: true,
            bility_number: true,
            bility_date: true,
            total_charges: true,
          },
          orderBy: { bility_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Shipments (Destination / Arrival City)',
          count: arrivingCount,
          items: sampleArriving.map((s) => ({
            id: s.register_number,
            primaryText: `Bilty #${s.bility_number}`,
            secondaryText: `Register #${s.register_number} • ${formatDate(s.bility_date)} • ${formatCurrency(s.total_charges)}`,
            badge: 'Destination',
            link: `/shipments/view?search=${encodeURIComponent(s.bility_number)}`,
          })),
        });
      }
      break;
    }

    case 'agency': {
      const agency = await prisma.agency.findUnique({
        where: { id },
        select: { name: true },
      });

      if (!agency) {
        return { canDelete: false, totalCount: 0, entityName: '', notFound: true, categories: [] };
      }
      entityName = agency.name;

      const shipmentsCount = await prisma.shipment.count({
        where: { forwarding_agency_id: id },
      });
      if (shipmentsCount > 0) {
        const sampleShipments = await prisma.shipment.findMany({
          where: { forwarding_agency_id: id },
          select: {
            register_number: true,
            bility_number: true,
            bility_date: true,
            total_charges: true,
          },
          orderBy: { bility_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Forwarded Shipments',
          count: shipmentsCount,
          items: sampleShipments.map((s) => ({
            id: s.register_number,
            primaryText: `Bilty #${s.bility_number}`,
            secondaryText: `Register #${s.register_number} • ${formatDate(s.bility_date)} • ${formatCurrency(s.total_charges)}`,
            badge: 'Agency',
            link: `/shipments/view?search=${encodeURIComponent(s.bility_number)}`,
          })),
        });
      }
      break;
    }

    case 'vehicle': {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        select: { vehicleNumber: true },
      });

      if (!vehicle) {
        return { canDelete: false, totalCount: 0, entityName: '', notFound: true, categories: [] };
      }
      entityName = vehicle.vehicleNumber;

      // 1. Shipments
      const shipmentsCount = await prisma.shipment.count({
        where: { vehicle_number_id: id },
      });
      if (shipmentsCount > 0) {
        const sampleShipments = await prisma.shipment.findMany({
          where: { vehicle_number_id: id },
          select: {
            register_number: true,
            bility_number: true,
            bility_date: true,
            total_charges: true,
          },
          orderBy: { bility_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Assigned Shipments',
          count: shipmentsCount,
          items: sampleShipments.map((s) => ({
            id: s.register_number,
            primaryText: `Bilty #${s.bility_number}`,
            secondaryText: `Register #${s.register_number} • ${formatDate(s.bility_date)} • ${formatCurrency(s.total_charges)}`,
            badge: 'Vehicle',
            link: `/shipments/view?search=${encodeURIComponent(s.bility_number)}`,
          })),
        });
      }

      // 2. Trip Logs
      const tripCount = await prisma.tripLog.count({
        where: { vehicle_id: id },
      });
      if (tripCount > 0) {
        const sampleTrips = await prisma.tripLog.findMany({
          where: { vehicle_id: id },
          select: {
            id: true,
            date: true,
            station_name: true,
            driver_name: true,
          },
          orderBy: { date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Trip Logs',
          count: tripCount,
          items: sampleTrips.map((t) => ({
            id: t.id,
            primaryText: `Trip Log #${t.id} (${t.station_name || 'Station'})`,
            secondaryText: `Date: ${formatDate(t.date)} • Driver: ${t.driver_name || 'N/A'}`,
            badge: 'Trip',
          })),
        });
      }

      // 3. Vehicle Transactions
      const txCount = await prisma.vehicleTransaction.count({
        where: { vehicle_id: id },
      });
      if (txCount > 0) {
        const sampleTx = await prisma.vehicleTransaction.findMany({
          where: { vehicle_id: id },
          select: {
            id: true,
            transaction_date: true,
            description: true,
            credit_amount: true,
            debit_amount: true,
          },
          orderBy: { transaction_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Vehicle Financial Transactions',
          count: txCount,
          items: sampleTx.map((tx) => ({
            id: tx.id,
            primaryText: `Transaction #${tx.id} - ${tx.description || 'Ledger Entry'}`,
            secondaryText: `Date: ${formatDate(tx.transaction_date)} • Credit: ${formatCurrency(tx.credit_amount)} • Debit: ${formatCurrency(tx.debit_amount)}`,
            badge: 'Ledger',
          })),
        });
      }
      break;
    }

    case 'party': {
      const party = await prisma.party.findUnique({
        where: { id },
        select: { name: true },
      });

      if (!party) {
        return { canDelete: false, totalCount: 0, entityName: '', notFound: true, categories: [] };
      }
      entityName = party.name;

      // 1. Sent Shipments (Sender)
      const senderCount = await prisma.shipment.count({
        where: { sender_id: id },
      });
      if (senderCount > 0) {
        const sampleSender = await prisma.shipment.findMany({
          where: { sender_id: id },
          select: {
            register_number: true,
            bility_number: true,
            bility_date: true,
            total_charges: true,
          },
          orderBy: { bility_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Shipments as Sender',
          count: senderCount,
          items: sampleSender.map((s) => ({
            id: s.register_number,
            primaryText: `Bilty #${s.bility_number}`,
            secondaryText: `Register #${s.register_number} • ${formatDate(s.bility_date)} • ${formatCurrency(s.total_charges)}`,
            badge: 'Sender',
            link: `/shipments/view?search=${encodeURIComponent(s.bility_number)}`,
          })),
        });
      }

      // 2. Received Shipments (Receiver)
      const receiverCount = await prisma.shipment.count({
        where: { receiver_id: id },
      });
      if (receiverCount > 0) {
        const sampleReceiver = await prisma.shipment.findMany({
          where: { receiver_id: id },
          select: {
            register_number: true,
            bility_number: true,
            bility_date: true,
            total_charges: true,
          },
          orderBy: { bility_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Shipments as Receiver',
          count: receiverCount,
          items: sampleReceiver.map((s) => ({
            id: s.register_number,
            primaryText: `Bilty #${s.bility_number}`,
            secondaryText: `Register #${s.register_number} • ${formatDate(s.bility_date)} • ${formatCurrency(s.total_charges)}`,
            badge: 'Receiver',
            link: `/shipments/view?search=${encodeURIComponent(s.bility_number)}`,
          })),
        });
      }

      // 3. Transactions referencing party
      const txCount = await prisma.transaction.count({
        where: { party_ref_id: id },
      });
      if (txCount > 0) {
        const sampleTx = await prisma.transaction.findMany({
          where: { party_ref_id: id },
          select: {
            transaction_id: true,
            shipment_id: true,
            transaction_date: true,
            description: true,
            credit_amount: true,
            debit_amount: true,
          },
          orderBy: { transaction_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Ledger Transactions',
          count: txCount,
          items: sampleTx.map((tx) => ({
            id: tx.transaction_id,
            primaryText: `Trx #${tx.transaction_id} (Shipment: ${tx.shipment_id})`,
            secondaryText: `Date: ${formatDate(tx.transaction_date)} • ${tx.description || 'Entry'} • Cr: ${formatCurrency(tx.credit_amount)} / Dr: ${formatCurrency(tx.debit_amount)}`,
            badge: 'Transaction',
          })),
        });
      }
      break;
    }

    case 'item': {
      const item = await prisma.itemCatalog.findUnique({
        where: { id },
        select: { item_description: true },
      });

      if (!item) {
        return { canDelete: false, totalCount: 0, entityName: '', notFound: true, categories: [] };
      }
      entityName = item.item_description;

      const goodsCount = await prisma.goodsDetails.count({
        where: { item_name_id: id },
      });
      if (goodsCount > 0) {
        const sampleGoods = await prisma.goodsDetails.findMany({
          where: { item_name_id: id },
          select: {
            good_detail_id: true,
            quantity: true,
            charges: true,
            shipment: {
              select: {
                register_number: true,
                bility_number: true,
                bility_date: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Shipments Containing This Item',
          count: goodsCount,
          items: sampleGoods.map((g) => ({
            id: g.good_detail_id,
            primaryText: `Bilty #${g.shipment?.bility_number || 'N/A'}`,
            secondaryText: `Register #${g.shipment?.register_number || 'N/A'} • Quantity: ${g.quantity} • Charges: ${formatCurrency(g.charges)}`,
            badge: 'Goods Item',
            link: g.shipment?.bility_number ? `/shipments/view?search=${encodeURIComponent(g.shipment.bility_number)}` : undefined,
          })),
        });
      }
      break;
    }

    case 'labour-person': {
      const person = await prisma.labourPerson.findUnique({
        where: { id },
        select: { name: true },
      });

      if (!person) {
        return { canDelete: false, totalCount: 0, entityName: '', notFound: true, categories: [] };
      }
      entityName = person.name;

      // 1. Assignments
      const assignmentCount = await prisma.labourAssignment.count({
        where: { labour_person_id: id },
      });
      if (assignmentCount > 0) {
        const sampleAssignments = await prisma.labourAssignment.findMany({
          where: { labour_person_id: id },
          select: {
            id: true,
            assigned_date: true,
            status: true,
            shipment: {
              select: {
                register_number: true,
                bility_number: true,
              },
            },
          },
          orderBy: { assigned_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Labour Assignments',
          count: assignmentCount,
          items: sampleAssignments.map((a) => ({
            id: a.id,
            primaryText: `Assignment #${a.id} (Bilty #${a.shipment?.bility_number || 'N/A'})`,
            secondaryText: `Date: ${formatDate(a.assigned_date)} • Status: ${a.status}`,
            badge: 'Assignment',
            link: a.shipment?.bility_number ? `/shipments/view?search=${encodeURIComponent(a.shipment.bility_number)}` : undefined,
          })),
        });
      }

      // 2. Payment History
      const paymentCount = await prisma.labourPaymentHistory.count({
        where: { labour_person_id: id },
      });
      if (paymentCount > 0) {
        const samplePayments = await prisma.labourPaymentHistory.findMany({
          where: { labour_person_id: id },
          select: {
            id: true,
            payment_date: true,
            amount_paid: true,
            shipment: {
              select: {
                register_number: true,
                bility_number: true,
              },
            },
          },
          orderBy: { payment_date: 'desc' },
          take: 10,
        });

        categories.push({
          title: 'Labour Payment Records',
          count: paymentCount,
          items: samplePayments.map((p) => ({
            id: p.id,
            primaryText: `Payment #${p.id} - ${formatCurrency(p.amount_paid)}`,
            secondaryText: `Date: ${formatDate(p.payment_date)} • Bilty #${p.shipment?.bility_number || 'N/A'}`,
            badge: 'Payment',
          })),
        });
      }
      break;
    }
  }

  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  return {
    canDelete: totalCount === 0,
    totalCount,
    entityName,
    categories,
  };
}
