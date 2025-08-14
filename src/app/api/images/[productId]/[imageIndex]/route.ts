import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/data/products';

export async function GET(
  request: Request,
  { params }: { params: { productId: string; imageIndex: string } }
) {
  try {
    const productId = params.productId;
    const imageIndex = params.imageIndex;
    const index = parseInt(imageIndex, 10);

    if (!productId || isNaN(index)) {
      return new NextResponse('Parámetros inválidos', { status: 400 });
    }

    const product = await getProductById(productId);

    if (!product) {
      return new NextResponse('Producto no encontrado', { status: 404 });
    }

    const allImages = [product.image, ...product.images].filter(Boolean);
    const imageUri = allImages[index];

    if (!imageUri) {
      return new NextResponse('Imagen no encontrada', { status: 404 });
    }

    // Si ya es una URL pública, simplemente redirigir a ella.
    if (imageUri.startsWith('http')) {
      return NextResponse.redirect(imageUri);
    }

    if (!imageUri.startsWith('data:image')) {
      return new NextResponse('La fuente de la imagen no es una URI de datos válida o una URL pública', { status: 400 });
    }

    const parts = imageUri.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const base64Data = parts[1];

    const imageBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for a year
      },
    });
  } catch (error) {
    console.error('Error al servir la imagen:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}
