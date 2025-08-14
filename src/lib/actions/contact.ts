
'use server';

import { sendContactFormEmail as sendContactFormEmailFromServer } from '@/lib/email.server';

/**
 * Procesa y envía el formulario de contacto.
 * @param data - Los datos del formulario de contacto (nombre, email, mensaje).
 * @returns Un objeto indicando si la operación fue exitosa o no.
 */
export async function sendContactFormAction(data: { name: string; email: string; message: string }) {
    try {
        await sendContactFormEmailFromServer(data);
        return { success: true };
    } catch (error) {
        console.error("Error sending contact form:", error);
        return { success: false, message: "No se pudo enviar el correo en este momento." };
    }
}
