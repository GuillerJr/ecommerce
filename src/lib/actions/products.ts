
'use server';

import type { Product, User } from '@/types';
import { 
    addProductToDb, 
    updateProductInDb, 
    deleteProductFromDb,
    getProductsFromDb,
    getProductById
} from '@/lib/data/products';
import { getUserById } from '@/lib/data/users';
import { getClient } from '@/lib/db.server';
import { revalidatePath } from 'next/cache';
import { sendNewProductNotificationEmail } from '../email.server';
import { logActivity } from '../data/activity';
import sharp from 'sharp';
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

export async function addProductAction(product: Product, user: User) {
    try {
        const newProduct = await addProductToDb(product);
        revalidatePath('/admin/productos');
        revalidatePath('/tienda');
        revalidatePath('/');
        const { password, ...userToLog } = user; // Exclude sensitive info
        const { reviews, seller, ...productToLog } = newProduct; // Exclude bulky info
        await logActivity({ userId: user.id, userName: user.name, action: 'create', entityType: 'Product', entityId: newProduct.id, details: productToLog });
        await sendNewProductNotificationEmail(newProduct);
        return { success: true, product: newProduct };
    } catch (error) {
        return { success: false, message: 'Error al añadir el producto.' };
    }
}

export async function updateProductAction(productData: Product, user: User) {
    try {
        const oldProduct = await getProductById(productData.id);
        if (!oldProduct) throw new Error("Product not found");

        await updateProductInDb(productData);
        revalidatePath('/admin/productos');
        revalidatePath(`/product/${productData.id}`);
        revalidatePath('/tienda');
        revalidatePath('/');
        
        const changes: Record<string, any> = {};
        for (const key in productData) {
            const typedKey = key as keyof Product;
            if (JSON.stringify(productData[typedKey]) !== JSON.stringify(oldProduct[typedKey])) {
                changes[typedKey] = {
                    old: oldProduct[typedKey],
                    new: productData[typedKey]
                };
            }
        }
        
        if (Object.keys(changes).length > 0) {
            await logActivity({ userId: user.id, userName: user.name, action: 'update', entityType: 'Product', entityId: productData.id, details: changes });
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al actualizar el producto.' };
    }
}

export async function deleteProductAction(id: string, userId: string): Promise<{ success: boolean; message?: string; }> {
    try {
        const product = await getProductById(id);
        const user = await getUserById(userId);
        if (!product || !user) return { success: false, message: 'Producto o usuario no encontrado' };
        await deleteProductFromDb(id);
        revalidatePath('/admin/productos');
        revalidatePath('/tienda');
        revalidatePath('/');
        await logActivity({ userId: user.id, userName: user.name, action: 'delete', entityType: 'Product', entityId: id, details: { name: product.name } });
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al eliminar el producto.' };
    }
}

export async function getProductsAction() {
    try {
        const products = await getProductsFromDb();
        return { success: true, products: JSON.parse(JSON.stringify(products)) };
    } catch (error) {
        return { success: false, message: 'Error al obtener los productos' };
    }
}

export async function addStockAction(productId: string, quantity: number, notes: string) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT name, stock FROM products WHERE id = $1', [productId]);
        if (productRes.rows.length === 0) {
            throw new Error("Producto no encontrado.");
        }
        const product = productRes.rows[0];
        const newStock = product.stock + quantity;

        await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, productId]);
        await client.query(
            'INSERT INTO kardex ("productId", "productName", date, type, quantity, balance, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [productId, product.name, new Date(), 'Entrada', quantity, newStock, notes]
        );
        
        await client.query('COMMIT');
        revalidatePath('/admin/inventario');
        revalidatePath('/admin/kardex');
        revalidatePath(`/product/${productId}`);
        
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        return { success: false, message: error instanceof Error ? error.message : 'Error al añadir stock.' };
    } finally {
        client.release();
    }
}

export async function optimizeImage(dataUrl: string): Promise<string> {
    const base64 = dataUrl.split(',')[1];
    if (!base64) throw new Error('URL de datos inválida');

    const buffer = Buffer.from(base64, 'base64');
    
    // Validar tamaño de archivo (ej. 10MB)
    const fileSizeInMB = buffer.length / (1024 * 1024);
    if (fileSizeInMB > 10) {
        throw new Error('El archivo de imagen es demasiado grande. El límite es 10MB.');
    }

    const optimizedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
      
    return `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;
}

export async function exportProductsToXlsx() {
    try {
        const products = await getProductsFromDb();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Stock');
        
        worksheet.columns = [
            { header: 'id', key: 'id', width: 40 },
            { header: 'name', key: 'name', width: 50 },
            { header: 'stock', key: 'stock', width: 15 },
        ];
        worksheet.getRow(1).font = { bold: true };
        
        products.forEach(p => {
            worksheet.addRow({ id: p.id, name: p.name, stock: p.stock });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return { success: true, data: base64 };
    } catch (error) {
        return { success: false, message: 'Error al exportar productos a XLSX.' };
    }
}

export async function importProductStockFromXlsx(base64Data: string) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        
        const buffer = Buffer.from(base64Data, 'base64');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            throw new Error("No se encontró una hoja en el archivo XLSX.");
        }

        let updatedCount = 0;
        const headerRow = worksheet.getRow(1);
        const idCol = headerRow.values!.indexOf('id');
        const stockCol = headerRow.values!.indexOf('stock');

        if (idCol === -1 || stockCol === -1) {
            throw new Error("El archivo debe contener las columnas 'id' y 'stock'.");
        }
        
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const id = row.getCell(idCol).value?.toString();
            const stock = parseInt(row.getCell(stockCol).value?.toString() || '0', 10);
            
            if (id && !isNaN(stock) && stock >= 0) {
                const productRes = await client.query('SELECT stock, name FROM products WHERE id = $1', [id]);
                if (productRes.rows.length > 0) {
                    const currentProduct = productRes.rows[0];
                    const quantityChange = stock - currentProduct.stock;
                    
                    if (quantityChange !== 0) {
                        await client.query('UPDATE products SET stock = $1 WHERE id = $2', [stock, id]);
                        await client.query(
                            'INSERT INTO kardex ("productId", "productName", date, type, quantity, balance, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                            [id, currentProduct.name, new Date(), quantityChange > 0 ? 'Entrada' : 'Salida', Math.abs(quantityChange), stock, 'Ajuste masivo por XLSX']
                        );
                        updatedCount++;
                    }
                }
            }
        }

        await client.query('COMMIT');
        revalidatePath('/admin/productos');
        revalidatePath('/admin/inventario');
        revalidatePath('/admin/kardex');
        return { success: true, message: `${updatedCount} productos actualizados.` };
    } catch (error) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Error al importar el archivo XLSX.' };
    } finally {
        client.release();
    }
}

export async function importProductsFromXlsx(base64Data: string, userId: string) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        
        const buffer = Buffer.from(base64Data, 'base64');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            throw new Error("No se encontró una hoja en el archivo XLSX.");
        }

        const subcategoryMap = new Map<string, string>();
        const subRes = await client.query("SELECT id, name FROM subcategories");
        subRes.rows.forEach(r => subcategoryMap.set(r.name.toLowerCase(), r.id));

        const brandMap = new Map<string, string>();
        const brandRes = await client.query("SELECT id, name FROM brands");
        brandRes.rows.forEach(r => brandMap.set(r.name.toLowerCase(), r.id));

        const user = await getUserById(userId);
        if (!user) throw new Error("User not found");

        let createdCount = 0;
        const headers = (worksheet.getRow(1).values as string[]).filter(Boolean);

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowData: any = {};
            headers.forEach((header, index) => {
                rowData[header] = row.getCell(index + 1).value;
            });
            
            const subcategoryId = subcategoryMap.get(rowData.nombre_subcategoria?.toLowerCase());
            if (!subcategoryId) {
                console.warn(`Subcategoría no encontrada para ${rowData.nombre}, saltando...`);
                continue;
            }

            const brandId = rowData.nombre_marca ? brandMap.get(rowData.nombre_marca.toLowerCase()) : undefined;

            const specsString = rowData.especificaciones || "";
            const specifications = specsString.split('\n')
                .filter((line: string) => line.includes(':'))
                .reduce((acc: Record<string, string>, line: string) => {
                    const [key, ...valueParts] = line.split(':');
                    const value = valueParts.join(':').trim();
                    if (key.trim() && value) {
                        acc[key.trim()] = value;
                    }
                    return acc;
                }, {});

            const productData: Product = {
                id: uuidv4(),
                name: rowData.nombre,
                description: rowData.descripcion_corta,
                longDescription: rowData.descripcion_larga,
                price: parseFloat(rowData.precio) || 0,
                subcategoryId,
                brandId,
                saleType: rowData.tipo_venta === 'on_demand' ? 'on_demand' : 'stock',
                stock: rowData.tipo_venta === 'stock' ? (parseInt(rowData.stock) || 0) : 0,
                image: 'https://placehold.co/600x400.png',
                images: [],
                seller: { id: 'seller-random', name: 'HackTrickStore', bio: 'Tu tienda de confianza.', avatar: 'https://placehold.co/100x100.png' },
                reviews: [],
                status: 'Activo',
                sizes: rowData.tallas ? rowData.tallas.split(',').map((s: string) => s.trim()) : [],
                customizationOptions: {
                    patches: rowData.permitir_parches === true,
                    nameAndNumber: rowData.permitir_nombre_numero === true,
                },
                specifications,
            };
            const newProduct = await addProductToDb(productData);
            await logActivity({ userId, userName: user.name, action: 'create', entityType: 'Product', entityId: newProduct.id, details: { name: newProduct.name, source: 'XLSX Import' } });
            createdCount++;
        }

        await client.query('COMMIT');
        revalidatePath('/admin/productos');
        return { success: true, message: `${createdCount} productos creados exitosamente.` };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Import error:", error);
        return { success: false, message: 'Error durante la importación masiva.' };
    } finally {
        client.release();
    }
}

export async function generateProductsXlsxTemplate(): Promise<{ success: boolean; data?: string; message?: string }> {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Plantilla de Productos');
        
        worksheet.columns = [
            { header: 'nombre', key: 'nombre', width: 30 },
            { header: 'descripcion_corta', key: 'descripcion_corta', width: 50 },
            { header: 'descripcion_larga', key: 'descripcion_larga', width: 70 },
            { header: 'precio', key: 'precio', width: 15, style: { numFmt: '"$"#,##0.00' } },
            { header: 'nombre_subcategoria', key: 'nombre_subcategoria', width: 30 },
            { header: 'nombre_marca', key: 'nombre_marca', width: 20 },
            { header: 'tipo_venta', key: 'tipo_venta', width: 15 },
            { header: 'stock', key: 'stock', width: 10 },
            { header: 'tallas', key: 'tallas', width: 30 },
            { header: 'especificaciones', key: 'especificaciones', width: 50 },
            { header: 'permitir_parches', key: 'permitir_parches', width: 20 },
            { header: 'permitir_nombre_numero', key: 'permitir_nombre_numero', width: 25 },
        ];
        
        worksheet.getRow(1).font = { bold: true };
        
        // Example 1: By Stock
        worksheet.addRow({
            nombre: 'Camiseta de Equipo Ejemplo',
            descripcion_corta: 'Una camiseta de alta calidad para deportistas.',
            descripcion_larga: 'Diseñada con tecnología de punta para máximo confort y rendimiento, esta camiseta es ideal para cualquier actividad física.',
            precio: 29.99,
            nombre_subcategoria: 'Uniformes de Fútbol', // Corrected to a subcategory example
            nombre_marca: 'Nike',
            tipo_venta: 'stock',
            stock: 100,
            tallas: 'S, M, L, XL',
            especificaciones: 'Material: Poliéster\nColor: Rojo/Azul',
            permitir_parches: true,
            permitir_nombre_numero: true,
        });

        // Example 2: On Demand
        worksheet.addRow({
            nombre: 'Gorra Personalizada Bajo Pedido',
            descripcion_corta: 'Una gorra bordada con tu diseño, hecha bajo pedido.',
            descripcion_larga: 'Crea tu propia gorra única. La fabricamos y enviamos una vez que realizas el pedido. Perfecta para equipos y eventos.',
            precio: 19.99,
            nombre_subcategoria: 'Gorras', // Example subcategory
            nombre_marca: 'Adidas',
            tipo_venta: 'on_demand',
            stock: null, // Stock is not applicable for on_demand
            tallas: 'Unitalla',
            especificaciones: 'Material: Algodón\nTipo de Cierre: Ajustable',
            permitir_parches: false,
            permitir_nombre_numero: false,
        });
        
        // Data validation for type of sale
        const tipoVentaCell = worksheet.getCell('G2');
        tipoVentaCell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"stock,on_demand"']
        };
        tipoVentaCell.note = "Valores permitidos: stock, on_demand";

        // Data validation for booleans
        ['K2', 'L2'].forEach(cell => {
             worksheet.getCell(cell).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['"TRUE,FALSE"']
            };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return { success: true, data: base64 };
    } catch (error) {
        return { success: false, message: 'No se pudo generar la plantilla XLSX.' };
    }
}
