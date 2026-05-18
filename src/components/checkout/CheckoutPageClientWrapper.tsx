
'use client';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { ReactPayPalScriptOptions } from "@paypal/react-paypal-js";
import CheckoutPageClient from "./CheckoutPageClient";
import type { StoreConfig } from "@/types";

export default function CheckoutPageClientWrapper({ storeConfig }: { storeConfig: StoreConfig }) {
  const paypalClientId = storeConfig?.paymentGateways?.paypal?.clientId;

  if (paypalClientId) {
      const paypalOptions: ReactPayPalScriptOptions = {
          clientId: paypalClientId,
          "client-id": paypalClientId,
          currency: storeConfig.currency.code || "USD",
          components: 'buttons',
      };
      return (
          <PayPalScriptProvider options={paypalOptions}>
              <CheckoutPageClient storeConfig={storeConfig} />
          </PayPalScriptProvider>
      );
  }

  return <CheckoutPageClient storeConfig={storeConfig} />;
}
