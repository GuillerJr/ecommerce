
import { getStoreConfigFromDb as getStoreConfig } from '@/lib/data/store';
import ContactoPageClient from '@/components/contacto/ContactoPageClient';

export default async function ContactoPage() {
    const storeConfig = await getStoreConfig();
    return <ContactoPageClient storeConfig={storeConfig} />
}
