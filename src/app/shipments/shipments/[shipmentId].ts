import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shipmentId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (typeof shipmentId !== 'string') {
    return res.status(400).json({ message: 'Invalid Shipment ID format' });
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: {
        register_number: shipmentId, // Assumes shipmentId from query matches the register_number field
      },
      include: {
        // Eagerly load the GoodsDetails and their corresponding ItemCatalog for the ReturnForm
        goodsDetails: {
          include: {
            itemCatalog: true, 
          },
        },
        departureCity: true,
        toCity: true,
        sender: true,
        receiver: true,
        forwardingAgency: true,
        vehicle: true,
      },
    });

    if (!shipment) {
      // This is what likely causes the "Shipment not found" error if the ID is incorrect
      return res.status(404).json({ message: 'Shipment not found with this ID.' });
    }

    // Convert Decimal types to string for safe JSON serialization
    const serializeShipment = {
        ...shipment,
        total_charges: shipment.total_charges.toString(),
        total_delivery_charges: shipment.total_delivery_charges.toString(),
        goodsDetails: shipment.goodsDetails.map(detail => ({
            ...detail,
            charges: detail.charges.toString(),
            delivery_charges: detail.delivery_charges.toString(),
        }))
    };

    return res.status(200).json(serializeShipment);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await prisma.$disconnect();
  }
}