import os

file_path = r'e:\goods-management-system\src\app\shipments\add\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target block to replace (flexible with whitespace)
import re

# Header replacement
header_pattern = re.compile(r"<TableHead className='text-right'>{t\('shipment_delivery_charges_label'\)}</TableHead>\s*<TableHead className='text-right'>Payment Status</TableHead>")
header_replacement = "<TableHead className='text-right'>{t('shipment_delivery_charges_label')}</TableHead>\n                                    <TableHead className='text-right'>{t('shipment_table_total_amount')}</TableHead>\n                                    <TableHead className='text-right'>Payment Status</TableHead>"

# Body replacement - specifically the mess I created
# I need to match the specific mess:
# <TableCell className='text-right font-bold'> ... </TableCell> <TableCell> ... </TableCell> </TableCell>
body_pattern = re.compile(r"<TableCell className='text-right font-bold'>\s*\{shipment\.payment_status === 'ALREADY_PAID'.*?\{!shipment\.payment_status && <span className='text-gray-400'>-</span>\}\s*</TableCell>\s*<TableCell className='text-right font-semibold'>\s*\{formatCurrency\(Number\(shipment\.total_charges \|\| 0\)\)\}\s*</TableCell>\s*</TableCell>", re.DOTALL)

body_replacement = """<TableCell className='text-right font-semibold'>
                                            {formatCurrency(Number(shipment.total_charges || 0))}
                                        </TableCell>
                                        <TableCell className='text-right font-bold'>
                                            {shipment.payment_status === 'ALREADY_PAID' && <span className='text-green-600'>{t('shipment_is_paid_label')}</span>}
                                            {shipment.payment_status === 'FREE' && <span className='text-blue-600'>{t('shipment_is_free_label')}</span>}
                                            {shipment.payment_status === 'PENDING' && <span className='text-red-600'>PENDING</span>}
                                            {!shipment.payment_status && <span className='text-gray-400'>-</span>}
                                        </TableCell>"""

# If the header wasn't already replaced (it might have been in one of the successful partial ones)
if "{t('shipment_table_total_amount')}" not in content:
    content = header_pattern.sub(header_replacement, content)

# Replace the body mess
new_content = body_pattern.sub(body_replacement, content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated page.tsx")
else:
    print("Failed to find pattern in page.tsx")
    # Let's see what it looks like
    start_index = content.find("<TableBody>")
    if start_index != -1:
        print("TableBody found, content around it:")
        print(content[start_index:start_index+2000])
