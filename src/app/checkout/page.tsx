/**
 * @fileoverview Página del lado del servidor para el proceso de pago.
 * Se encarga de obtener la configuración de la tienda y la pasa al componente cliente.
 */

import { getStoreConfigAction } from "@/lib/actions/store";
import CheckoutPageClientWrapper from "@/components/checkout/CheckoutPageClientWrapper";

export default async function CheckoutPage() {
    const configResult = await getStoreConfigAction();
    const storeConfig = configResult.success ? configResult.config : null;

    if (!storeConfig) {
        return (
            <div className="flex h-screen items-center justify-center">
                Error al cargar la configuración de la tienda.
            </div>
        );
    }
    
    return <CheckoutPageClientWrapper storeConfig={storeConfig} />;
}
