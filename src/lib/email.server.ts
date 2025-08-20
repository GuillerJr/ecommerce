

'use server';

import type { Order, Product, Discount, User, Giveaway } from '@/types';
import { getProductById } from '@/lib/data/products';
import { getStoreConfigFromDb } from '@/lib/data/store';
import { getUsers } from '@/lib/data/users';
import nodemailer from 'nodemailer';

// =======================================================================================
// Nodemailer Email Sending Implementation
// This is configured to send real emails using Nodemailer.
// It reads SMTP server credentials from the .env file.
// =======================================================================================

const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

// Create a transporter object. It's reusable.
const transporter = (smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass) 
    ? nodemailer.createTransport(smtpConfig)
    : null;

const fromEmail = process.env.SMTP_FROM_EMAIL || 'HackTrickStore <noreply@example.com>';

const getEmailHtml = async (title: string, content: string, withButton?: {text: string, url: string}): Promise<string> => {
    const storeConfig = await getStoreConfigFromDb();
    const storeName = storeConfig.name;
    const year = new Date().getFullYear();

    const buttonHtml = withButton ? `
      <div class="button-container">
          <a href="${withButton.url}" class="button">${withButton.text}</a>
      </div>
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background-color: hsl(0, 0%, 9%); color: hsl(0, 0%, 98%); padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 30px 40px; color: #374151; }
            .content h2 { color: #111827; margin-top: 0; font-size: 22px; }
            .content p { line-height: 1.7; margin: 16px 0; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { display: inline-block; background-color: hsl(0, 0%, 9%); color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
            .footer { background-color: #f3f4f6; color: #6b7280; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #e5e7eb; }
            .footer a { color: hsl(0, 0%, 9%); text-decoration: none; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; border: 1px solid #e5e7eb; }
            th { background-color: #f9fafb; text-align: left; font-weight: 600; }
            .total-row td { font-weight: bold; font-size: 1.1em; }
            .summary-table .total-row td { border-top: 2px solid #ddd; }
            .subtle { color: #6b7280; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${storeName}</h1>
            </div>
            <div class="content">
                <h2>${title}</h2>
                ${content}
                ${buttonHtml}
            </div>
            <div class="footer">
                &copy; ${year} ${storeName}. Todos los derechos reservados.<br>
                ${storeConfig.address.street}, ${storeConfig.address.city}, ${storeConfig.address.country}
            </div>
        </div>
    </body>
    </html>
    `;
};


export async function sendEmail(to: string | string[], subject: string, html: string, attachments?: nodemailer.SendMailOptions['attachments']) {
    if (!transporter) {
        console.error("==========================================================");
        console.error("📧 SMTP transporter not configured. Email will not be sent. 📧");
        console.error("📧 Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file. 📧");
        console.error("==========================================================");
        throw new Error("SMTP transporter is not configured. Cannot send email.");
    }
    
    const mailOptions: nodemailer.SendMailOptions = {
        from: fromEmail,
        subject: subject,
        html: html,
        attachments: attachments || [],
    };

    if (Array.isArray(to)) {
        mailOptions.to = fromEmail;
        mailOptions.bcc = to;
    } else {
        mailOptions.to = to;
    }
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email.");
    }
}


export async function sendOrderConfirmationEmail(order: Order, pdfBuffer?: Buffer) {
  const storeConfig = await getStoreConfigFromDb();
  const subject = `Confirmación de tu pedido #${order.id.substring(0, 8)}`;
  const title = `¡Gracias por tu compra, ${order.customerName}!`;
  
  const itemPromises = order.items.map(async item => {
    const product = await getProductById(item.productId);
    return `
      <tr>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${product?.name || 'Producto Desconocido'}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
      </tr>
    `;
  });
  const itemsHtml = (await Promise.all(itemPromises)).join('');

  const content = `
    <p>Hemos recibido tu pedido y lo estamos procesando. Aquí tienes un resumen:</p>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th style="text-align: center;">Cantidad</th>
          <th style="text-align: right;">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <table class="summary-table">
        <tbody>
            <tr class="total-row">
                <td colspan="2" style="text-align: right; border: none;">Subtotal:</td>
                <td style="text-align: right; border: none;">$${order.subtotal.toFixed(2)}</td>
            </tr>
            ${order.discountAmount > 0 ? `
            <tr class="total-row" style="color: #ef4444;">
                <td colspan="2" style="text-align: right; border: none;">Descuento:</td>
                <td style="text-align: right; border: none;">-$${order.discountAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${order.taxAmount && order.taxAmount > 0 ? `
            <tr class="total-row">
                <td colspan="2" style="text-align: right; border: none;">IVA (${order.taxRate}%):</td>
                <td style="text-align: right; border: none;">$${order.taxAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
                <td colspan="2" style="text-align: right; border: none;">Total Pagado:</td>
                <td style="text-align: right; border: none;">$${order.total.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    <p>Puedes ver los detalles de tu pedido y seguir su estado en tu cuenta.</p>
    <p>Saludos,<br>El equipo de ${storeConfig.name}</p>
  `;
  
  const html = await getEmailHtml(title, content, { text: 'Ver mis pedidos', url: `${storeConfig.baseUrl}/pedidos` });

  const attachments: nodemailer.SendMailOptions['attachments'] = [];
  if (pdfBuffer) {
      attachments.push({
          filename: `factura-${order.id.substring(0,8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
      });
  }

  await sendEmail(order.email, subject, html, attachments);
}

export async function sendOrderStatusUpdateEmail(order: Order) {
  const storeConfig = await getStoreConfigFromDb();
  const subject = `Actualización de tu pedido #${order.id.substring(0, 8)}`;
  const title = `Tu pedido está ${order.status}`;
  
  const content = `
    <p>Hola, ${order.customerName},</p>
    <p>Hay una actualización sobre tu pedido. El nuevo estado es: <strong>${order.status}</strong></p>
    <p>${order.trackingHistory[order.trackingHistory.length - 1].description}</p>
    <p>Puedes ver los detalles completos de tu pedido y seguir su estado haciendo clic en el botón de abajo.</p>
    <p>Saludos,<br>El equipo de ${storeConfig.name}</p>
  `;

  const html = await getEmailHtml(title, content, { text: 'Ver mi pedido', url: `${storeConfig.baseUrl}/pedidos` });

  await sendEmail(order.email, subject, html);
}

export async function sendContactFormEmail(data: { name: string; email: string; message: string }) {
  const storeConfig = await getStoreConfigFromDb();
  const subject = `Nuevo mensaje de contacto de ${data.name}`;
  const storeEmail = storeConfig.contactEmail;
  const title = `Nuevo mensaje de contacto`;

  const content = `
    <p>Has recibido un nuevo mensaje desde el formulario de contacto de ${storeConfig.name}:</p>
    <ul style="list-style: none; padding: 0;">
      <li style="margin-bottom: 10px;"><strong>Nombre:</strong> ${data.name}</li>
      <li style="margin-bottom: 10px;"><strong>Email (para responder):</strong> <a href="mailto:${data.email}">${data.email}</a></li>
    </ul>
    <p><strong>Mensaje:</strong></p>
    <blockquote style="padding: 15px; margin: 0 0 20px; border-left: 5px solid #e5e7eb; background: #f9fafb;">
      <p style="margin: 0;">${data.message.replace(/\n/g, '<br>')}</p>
    </blockquote>
  `;
  
  const html = await getEmailHtml(title, content);

  await sendEmail(storeEmail, subject, html);
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const storeConfig = await getStoreConfigFromDb();
    const resetLink = `${storeConfig.baseUrl}/reset-password?token=${token}`;
    const subject = `Restablece tu contraseña de ${storeConfig.name}`;
    const title = `Restablece tu contraseña`;

    const content = `
        <p>Hola,</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente botón para continuar.</p>
        <p class="subtle">Este enlace es válido por 1 hora.</p>
        <p>Si no solicitaste esto, puedes ignorar este correo de forma segura.</p>
        <p>Saludos,<br>El equipo de ${storeConfig.name}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p class="subtle">Si el botón no funciona, copia y pega este enlace en tu navegador: <br><a href="${resetLink}" style="color: #09090b;">${resetLink}</a></p>
    `;

    const html = await getEmailHtml(title, content, { text: 'Restablecer Contraseña', url: resetLink });
    await sendEmail(email, subject, html);
}

export async function sendAccountVerificationEmail(email: string, token: string) {
    const storeConfig = await getStoreConfigFromDb();
    const verificationLink = `${storeConfig.baseUrl}/verify-email?token=${token}`;
    const subject = `Verifica tu cuenta en ${storeConfig.name}`;
    const title = `¡Bienvenido a ${storeConfig.name}!`;

    const content = `
        <p>Hola,</p>
        <p>Gracias por registrarte. Por favor, haz clic en el botón de abajo para verificar tu dirección de correo electrónico y activar tu cuenta.</p>
        <p class="subtle">Este enlace es válido por 24 horas.</p>
        <p>Si no te registraste en nuestro sitio, puedes ignorar este correo de forma segura.</p>
        <p>Saludos,<br>El equipo de ${storeConfig.name}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p class="subtle">Si el botón no funciona, copia y pega este enlace en tu navegador: <br><a href="${verificationLink}" style="color: #09090b;">${verificationLink}</a></p>
    `;

    const html = await getEmailHtml(title, content, { text: 'Verificar mi cuenta', url: verificationLink });
    await sendEmail(email, subject, html);
}

export async function sendNewProductNotificationEmail(product: Product) {
  const storeConfig = await getStoreConfigFromDb();
  const allUsers = (await getUsers()).filter(u => u.status === 'Activo');
  if (allUsers.length === 0) return;

  const subject = `¡Nuevo Lanzamiento! ${product.name}`;
  const title = `Descubre lo Nuevo en ${storeConfig.name}`;
  
  const imageUrl = `${storeConfig.baseUrl}/api/images/${product.id}/0`;
  const imageHtml = `<img src="${imageUrl}" alt="${product.name}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">`;

  const content = `
    <p>Hola,</p>
    <p>Queremos que seas el primero en saber sobre nuestro último lanzamiento. ¡Ya está disponible y listo para ti!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${storeConfig.baseUrl}/product/${product.id}">
        ${imageHtml}
      </a>
      <h3 style="font-size: 20px; color: #111827; margin: 15px 0 5px;">${product.name}</h3>
      <p style="font-size: 16px; color: #374151; margin: 0;"><strong>$${product.price.toFixed(2)}</strong></p>
    </div>
    <p>Este producto ha sido cuidadosamente seleccionado para ofrecerte la mejor calidad y rendimiento. ¡No te quedes sin el tuyo!</p>
  `;
  
  const html = await getEmailHtml(title, content, { text: 'Ver Producto', url: `${storeConfig.baseUrl}/product/${product.id}` });
  
  const recipients = allUsers.map(u => u.email);
  await sendEmail(recipients, subject, html);
}

export async function sendNewDiscountNotificationEmail(product: Product, discount: Discount) {
  const storeConfig = await getStoreConfigFromDb();
  const allUsers = (await getUsers()).filter(u => u.status === 'Activo');
  if (allUsers.length === 0) return;

  const subject = `¡Oferta Especial! Descuento en ${product.name}`;
  const title = `¡No te pierdas esta oferta!`;

  const finalPrice = discount.type === 'Porcentaje' 
      ? product.price * (1 - discount.value / 100) 
      : product.price - discount.value;

  const discountText = discount.type === 'Porcentaje'
      ? `${discount.value}% de descuento`
      : `$${discount.value.toFixed(2)} de descuento`;
      
  const imageUrl = `${storeConfig.baseUrl}/api/images/${product.id}/0`;
  const imageHtml = `<img src="${imageUrl}" alt="${product.name}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">`;

  const content = `
    <p>Hola,</p>
    <p>¡Tenemos una oferta especial que no querrás dejar pasar! Por tiempo limitado, disfruta de un increíble descuento en uno de tus productos favoritos.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${storeConfig.baseUrl}/product/${product.id}">
        ${imageHtml}
      </a>
      <h3 style="font-size: 20px; color: #111827; margin: 15px 0 5px;">${product.name}</h3>
      <p style="font-size: 16px; color: #6b7280; margin: 0; text-decoration: line-through;">Antes: $${product.price.toFixed(2)}</p>
      <p style="font-size: 20px; color: #ef4444; margin: 5px 0 10px;"><strong>¡Ahora: $${finalPrice.toFixed(2)}!</strong></p>
      <p style="font-size: 14px; color: #16a34a; margin: 0;"><strong>(${discountText})</strong></p>
    </div>
    <p>Aprovecha esta oportunidad para conseguir el equipamiento que necesitas al mejor precio.</p>
  `;
  
  const html = await getEmailHtml(title, content, { text: 'Comprar Ahora', url: `${storeConfig.baseUrl}/product/${product.id}` });
  
  const recipients = allUsers.map(u => u.email);
  await sendEmail(recipients, subject, html);
}

export async function sendGiveawayWinnerEmail(winner: User, giveaway: Giveaway) {
  const storeConfig = await getStoreConfigFromDb();
  const prizeProduct = await getProductById(giveaway.productPrizeIds[0]); // Assuming one prize for now
  const subject = `¡Felicidades! Has ganado el sorteo de ${storeConfig.name}`;
  const title = `¡Eres el ganador!`;
  
  const imageUrl = prizeProduct ? `${storeConfig.baseUrl}/api/images/${prizeProduct.id}/0` : '';
  const imageHtml = prizeProduct ? `<a href="${storeConfig.baseUrl}/product/${prizeProduct.id}">
        <img src="${imageUrl}" alt="${prizeProduct.name}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">
      </a>` : '';


  const content = `
    <p>Hola, ${winner.name},</p>
    <p>¡Tenemos noticias emocionantes! Has sido elegido como el ganador del sorteo "<strong>${giveaway.name}</strong>".</p>
    <p>Has ganado el siguiente premio:</p>
    <div style="text-align: center; margin: 30px 0;">
      ${imageHtml}
      <h3 style="font-size: 20px; color: #111827; margin: 15px 0 5px;">${prizeProduct?.name || 'Un premio increíble'}</h3>
    </div>
    <p>Nos pondremos en contacto contigo pronto para coordinar la entrega de tu premio. ¡Gracias por participar!</p>
    <p>Saludos,<br>El equipo de ${storeConfig.name}</p>
  `;

  const html = await getEmailHtml(title, content, { text: 'Visitar la tienda', url: storeConfig.baseUrl });
  await sendEmail(winner.email, subject, html);
}

export async function sendBackInStockNotification(user: User, product: Product) {
    const storeConfig = await getStoreConfigFromDb();
    const subject = `¡De vuelta en stock! ${product.name} ya está disponible`;
    const title = `¡Está de vuelta!`;
    const productUrl = `${storeConfig.baseUrl}/product/${product.id}`;
    
    const imageUrl = `${storeConfig.baseUrl}/api/images/${product.id}/0`;
    const imageHtml = `<img src="${imageUrl}" alt="${product.name}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">`;

    const content = `
        <p>Hola ${user.name},</p>
        <p>Buenas noticias. El producto que te interesa, <strong>${product.name}</strong>, ¡ya está disponible de nuevo!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${productUrl}">
            ${imageHtml}
          </a>
          <h3 style="font-size: 20px; color: #111827; margin: 15px 0 5px;">${product.name}</h3>
          <p style="font-size: 16px; color: #374151; margin: 0;"><strong>$${product.price.toFixed(2)}</strong></p>
        </div>
        <p>No esperes más, las unidades son limitadas. ¡Consigue el tuyo antes de que se agote otra vez!</p>
    `;

    const html = await getEmailHtml(title, content, { text: 'Comprar ahora', url: productUrl });
    await sendEmail(user.email, subject, html);
}
