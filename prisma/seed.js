const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding for Zikria Goods Transport Company ERP...');

    // 1. Clear existing data safely in reverse dependency order
    console.log('🧹 Cleaning old records...');
    await prisma.labourPaymentHistory.deleteMany().catch(() => { });
    await prisma.labourAssignment.deleteMany().catch(() => { });
    await prisma.labourPerson.deleteMany().catch(() => { });
    await prisma.delivery.deleteMany().catch(() => { });
    await prisma.returnItem.deleteMany().catch(() => { });
    await prisma.returnShipment.deleteMany().catch(() => { });
    await prisma.goodsDetails.deleteMany().catch(() => { });
    await prisma.transaction.deleteMany().catch(() => { });
    await prisma.vehicleTransaction.deleteMany().catch(() => { });
    await prisma.tripShipmentLog.deleteMany().catch(() => { });
    await prisma.tripLog.deleteMany().catch(() => { });
    await prisma.shipment.deleteMany().catch(() => { });
    await prisma.itemCatalog.deleteMany().catch(() => { });
    await prisma.party.deleteMany().catch(() => { });
    await prisma.vehicle.deleteMany().catch(() => { });
    await prisma.agency.deleteMany().catch(() => { });
    await prisma.city.deleteMany().catch(() => { });
    await prisma.user.deleteMany().catch(() => { });
    await prisma.systemSetting.deleteMany().catch(() => { });

    // 2. Seed System Settings
    console.log('⚙️ Seeding System Settings...');
    await prisma.systemSetting.createMany({
        data: [
            { key: 'EDIT_BILTY_PASSWORD', value: '1234' },
            { key: 'COMPANY_NAME', value: 'Zikria Goods Transport Company' },
            { key: 'MAIN_STATION', value: 'Sargodha, Pakistan' },
        ],
        skipDuplicates: true,
    });

    // 3. Seed Users with hashed passwords
    console.log('👤 Seeding Users...');
    const hashedSuperAdminPassword = await bcrypt.hash('superadmin123', 10);
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedOperatorPassword = await bcrypt.hash('operator123', 10);

    const users = await Promise.all([
        prisma.user.create({
            data: {
                username: 'superadmin',
                password: hashedSuperAdminPassword,
                role: 'SUPERADMIN',
            },
        }),
        prisma.user.create({
            data: {
                username: 'admin',
                password: hashedAdminPassword,
                role: 'ADMIN',
            },
        }),
        prisma.user.create({
            data: {
                username: 'operator',
                password: hashedOperatorPassword,
                role: 'OPERATOR',
            },
        }),
    ]);
    console.log(`✅ Created ${users.length} users (superadmin, admin, operator).`);

    // 4. Seed Cities
    console.log('🏙️ Seeding Cities...');
    const cityNames = [
        'Sargodha',
        'Gujranwala',
        'Lahore',
        'Islamabad',
        'Rawalpindi',
        'Faisalabad',
        'Karachi',
        'Multan',
        'Mianwali',
        'Peshawar',
        'Sialkot',
        'Gujrat',
        'Hyderabad',
        'Quetta',
        'Bhalwal',
        'Kot Momin',
    ];

    const cities = await Promise.all(
        cityNames.map(name =>
            prisma.city.upsert({
                where: { name },
                update: {},
                create: { name },
            })
        )
    );
    console.log(`✅ Created ${cities.length} cities.`);

    // 5. Seed Agencies
    console.log('🏢 Seeding Forwarding Agencies...');
    const agencyNames = [
        'Direct / Main Branch',
        'Zikria Express',
        'Al-Madina Goods',
        'Niazi Cargo Services',
        'Bilal Goods Transport',
        'Kohistan Freight Agency',
        'Shahzad Goods Agency',
    ];

    const agencies = await Promise.all(
        agencyNames.map(name =>
            prisma.agency.upsert({
                where: { name },
                update: {},
                create: { name },
            })
        )
    );
    console.log(`✅ Created ${agencies.length} agencies.`);

    // 6. Seed Vehicles
    console.log('🚛 Seeding Vehicles...');
    const vehicleNumbers = [
        'SG-1081 (Mazda Titan)',
        'LHR-4520 (Hino Truck)',
        'ISL-9988 (Isuzu Forward)',
        'RWP-3312 (Bedford Truck)',
        'FSD-7711 (Shahzore)',
        'MLT-2234 (Master Truck)',
        'KHI-8910 (10 Wheeler Hino)',
    ];

    const vehicles = await Promise.all(
        vehicleNumbers.map(vehicleNumber =>
            prisma.vehicle.upsert({
                where: { vehicleNumber },
                update: {},
                create: { vehicleNumber },
            })
        )
    );
    console.log(`✅ Created ${vehicles.length} vehicles.`);

    // 7. Seed Parties
    console.log('👥 Seeding Parties / Clients...');
    const partyList = [
        { name: 'Cash / Walk-in Customer', contactInfo: 'N/A', opening_balance: 0.00 },
        { name: 'Main Abid Goods Traders', contactInfo: '0300-1234567 (Sargodha)', opening_balance: 0.00 },
        { name: 'Moiz Hassan Enterprises', contactInfo: '0301-7654321 (Lahore)', opening_balance: 0.00 },
        { name: 'Malik & Sons Logistics', contactInfo: '0322-9988776 (Gujranwala)', opening_balance: 0.00 },
        { name: 'Prime Textile Mills', contactInfo: '0345-5544332 (Faisalabad)', opening_balance: 0.00 },
        { name: 'Tariq Machinery Store', contactInfo: '0312-3344556 (Rawalpindi)', opening_balance: 0.00 },
        { name: 'Al-Rehman Auto Parts', contactInfo: '0300-8899001 (Islamabad)', opening_balance: 0.00 },
        { name: 'Kisan Agri Fertilizers', contactInfo: '0305-6677889 (Multan)', opening_balance: 0.00 },
    ];

    const parties = await Promise.all(
        partyList.map(p =>
            prisma.party.create({
                data: {
                    name: p.name,
                    contactInfo: p.contactInfo,
                    opening_balance: p.opening_balance,
                },
            })
        )
    );
    console.log(`✅ Created ${parties.length} parties.`);

    // 8. Seed Item Catalog
    console.log('📦 Seeding Item Catalogs...');
    const items = [
        'Textiles / کپڑا',
        'Electronics & Appliances / برقی سامان',
        'Spare Parts / سپیئر پارٹس',
        'Cotton Bales / کپاس کی گانٹھیں',
        'General Cargo / متفرق سامان',
        'Heavy Machinery / بھاری مشینری',
        'Garments & Apparel / ریڈی میڈ گارمنٹس',
        'Plastic & Polymers / پلاسٹک کا سامان',
        'Chemicals & Fertilizer / کھاد و کیمیکلز',
        'Auto Tires & Tubes / ٹائر ٹیوب',
    ];

    const itemCatalogs = await Promise.all(
        items.map(item_description =>
            prisma.itemCatalog.upsert({
                where: { item_description },
                update: {},
                create: { item_description },
            })
        )
    );
    console.log(`✅ Created ${itemCatalogs.length} item catalog descriptions.`);

    // 9. Seed Labour Persons
    console.log('👷 Seeding Labour Personnel...');
    const labourPersonnel = [
        { name: 'Aslam Khan (Head Loader)', contact_info: '0300-1122334' },
        { name: 'Tariq Mehmood (Cart Labour)', contact_info: '0321-2233445' },
        { name: 'Babar Ali (Station Hand)', contact_info: '0333-4455667' },
        { name: 'Ghulam Rasool (Loader)', contact_info: '0344-7788990' },
    ];

    const labourPersons = await Promise.all(
        labourPersonnel.map(lp =>
            prisma.labourPerson.create({
                data: {
                    name: lp.name,
                    contact_info: lp.contact_info,
                },
            })
        )
    );
    console.log(`✅ Created ${labourPersons.length} labour persons.`);

    // 10. Seed Demo Shipments (Initial Bilties)
    console.log('📄 Seeding Initial Demo Consignments...');
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const regDatePrefix = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0');

    const sargodhaCity = cities.find(c => c.name === 'Sargodha') || cities[0];
    const gujranwalaCity = cities.find(c => c.name === 'Gujranwala') || cities[1];
    const lahoreCity = cities.find(c => c.name === 'Lahore') || cities[2];

    const demoShipments = [
        {
            register_number: `${regDatePrefix}-0001`,
            bility_number: 'BIL-1001',
            bility_date: today,
            departure_city_id: sargodhaCity.id,
            to_city_id: gujranwalaCity.id,
            forwarding_agency_id: agencies[0].id,
            vehicle_number_id: vehicles[0].id,
            sender_id: parties[1].id, // Main Abid
            receiver_id: parties[3].id, // Malik & Sons
            total_delivery_charges: 500.00,
            total_charges: 4500.00,
            station_expense: 100.00,
            bility_expense: 50.00,
            station_labour: 150.00,
            cart_labour: 100.00,
            total_expenses: 400.00,
            remarks: 'Priority delivery via Sargodha bypass',
            goods: [
                { item_id: itemCatalogs[0].id, quantity: 15, charges: 3000.00, delivery_charges: 300.00 },
                { item_id: itemCatalogs[2].id, quantity: 5, charges: 1500.00, delivery_charges: 200.00 },
            ],
        },
        {
            register_number: `${regDatePrefix}-0002`,
            bility_number: 'BIL-1002',
            bility_date: today,
            departure_city_id: sargodhaCity.id,
            to_city_id: lahoreCity.id,
            forwarding_agency_id: agencies[1].id,
            vehicle_number_id: vehicles[1].id,
            sender_id: parties[4].id, // Prime Textile Mills
            receiver_id: parties[2].id, // Moiz Hassan Enterprises
            total_delivery_charges: 800.00,
            total_charges: 8500.00,
            station_expense: 200.00,
            bility_expense: 50.00,
            station_labour: 300.00,
            cart_labour: 150.00,
            total_expenses: 700.00,
            remarks: 'Cotton rolls standard cargo',
            goods: [
                { item_id: itemCatalogs[3].id, quantity: 40, charges: 8500.00, delivery_charges: 800.00 },
            ],
        },
    ];

    for (const ds of demoShipments) {
        await prisma.shipment.create({
            data: {
                register_number: ds.register_number,
                bility_number: ds.bility_number,
                bility_date: ds.bility_date,
                departure_city_id: ds.departure_city_id,
                to_city_id: ds.to_city_id,
                forwarding_agency_id: ds.forwarding_agency_id,
                vehicle_number_id: ds.vehicle_number_id,
                sender_id: ds.sender_id,
                receiver_id: ds.receiver_id,
                total_delivery_charges: ds.total_delivery_charges,
                total_charges: ds.total_charges,
                station_expense: ds.station_expense,
                bility_expense: ds.bility_expense,
                station_labour: ds.station_labour,
                cart_labour: ds.cart_labour,
                total_expenses: ds.total_expenses,
                remarks: ds.remarks,
                created_day: today,
                goodsDetails: {
                    create: ds.goods.map(g => ({
                        item_name_id: g.item_id,
                        quantity: g.quantity,
                        charges: g.charges,
                        delivery_charges: g.delivery_charges,
                    })),
                },
            },
        });
    }
    console.log(`✅ Created ${demoShipments.length} initial bilty consignments.`);

    console.log('\n🎉 ==============================================');
    console.log('🚀 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==============================================');
    console.log('🔑 Default Login Credentials:');
    console.log('   - SuperAdmin: username: "superadmin", password: "superadmin123"');
    console.log('   - Admin:      username: "admin",      password: "admin123"');
    console.log('   - Operator:   username: "operator",   password: "operator123"');
    console.log('🛡️ Edit Bilty Password: "1234" (Configured in Master Data)');
    console.log('==============================================\n');
}

main()
    .catch((e) => {
        console.error('❌ Seeding Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
