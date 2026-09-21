export const BACKUP_FORMAT = 'zikria-gms-backup';
export const BACKUP_VERSION = 1;
export const RESTORE_CONFIRMATION = 'RESTORE';
export const MAX_BACKUP_BYTES = 80 * 1024 * 1024;
export const INSERT_CHUNK_SIZE = 400;

export const BACKUP_TABLES = [
    { key: 'User', model: 'user', sqlName: 'User' },
    { key: 'SystemSetting', model: 'systemSetting', sqlName: 'System_Settings' },
    { key: 'City', model: 'city', sqlName: 'City' },
    { key: 'Agency', model: 'agency', sqlName: 'Agency' },
    { key: 'Vehicle', model: 'vehicle', sqlName: 'Vehicle' },
    { key: 'Party', model: 'party', sqlName: 'Party' },
    { key: 'ItemCatalog', model: 'itemCatalog', sqlName: 'ItemCatalog' },
    { key: 'LabourPerson', model: 'labourPerson', sqlName: 'Labour_Person' },
    { key: 'Shipment', model: 'shipment', sqlName: 'Shipment' },
    { key: 'GoodsDetails', model: 'goodsDetails', sqlName: 'Goods_Details' },
    { key: 'Transaction', model: 'transaction', sqlName: 'Transactions' },
    { key: 'ReturnShipment', model: 'returnShipment', sqlName: 'Return_Shipment' },
    { key: 'ReturnItem', model: 'returnItem', sqlName: 'Return_Items' },
    { key: 'TripLog', model: 'tripLog', sqlName: 'Trip_Log' },
    { key: 'TripShipmentLog', model: 'tripShipmentLog', sqlName: 'Trip_Shipment_Log' },
    { key: 'Delivery', model: 'delivery', sqlName: 'Delivery' },
    { key: 'VehicleTransaction', model: 'vehicleTransaction', sqlName: 'Vehicle_Transactions' },
    { key: 'LabourAssignment', model: 'labourAssignment', sqlName: 'Labour_Assignment' },
    { key: 'LabourPaymentHistory', model: 'labourPaymentHistory', sqlName: 'Labour_Payment_History' },
] as const;

export type BackupTableKey = (typeof BACKUP_TABLES)[number]['key'];
