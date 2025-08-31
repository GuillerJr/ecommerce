
import { getSuggestionsAction } from "@/lib/actions";
import SuggestionsPageClient from "@/components/admin/SuggestionsPageClient";

export const dynamic = 'force-dynamic';

export default async function AdminSuggestionsPage() {
  const result = await getSuggestionsAction();
  const suggestions = result.success ? result.suggestions || [] : [];

  return <SuggestionsPageClient initialSuggestions={suggestions} />;
}
