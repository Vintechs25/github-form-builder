import { useState } from "react";
import { Search, Globe, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

interface ContextType { user: User | null; }

interface SearchResult {
  domain: string;
  available: boolean;
  price: number | null;
}

const SearchDomain = () => {
  const { user } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [registering, setRegistering] = useState<string | null>(null);

  const tlds = [".com", ".net", ".org", ".co.ke", ".ke", ".info"];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);

    const baseName = query.trim().replace(/\.[a-z.]+$/i, "");
    const searchResults: SearchResult[] = [];

    for (const tld of tlds) {
      const domain = `${baseName}${tld}`;
      try {
        const { data, error } = await supabase.functions.invoke("namesilo-api", {
          body: { action: "checkAvailability", domain },
        });
        if (!error && data?.data) {
          searchResults.push({
            domain,
            available: data.data.available || false,
            price: data.data.price || null,
          });
        } else {
          searchResults.push({ domain, available: false, price: null });
        }
      } catch {
        searchResults.push({ domain, available: false, price: null });
      }
    }

    setResults(searchResults);
    setSearching(false);
  };

  const handleRegister = async (domain: string) => {
    if (!user) return;
    setRegistering(domain);
    try {
      // Create order
      const price = results.find((r) => r.domain === domain)?.price || 0;
      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id,
        type: "domain",
        total_amount: price,
        domain_name: domain,
        status: "pending",
        billing_cycle: "yearly",
      }).select().single();

      if (error) throw error;

      // Create invoice
      const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from("invoices").insert({
        user_id: user.id,
        order_id: order.id,
        invoice_number: invNum,
        amount: price,
        status: "unpaid",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: `Domain Registration: ${domain}`,
      });

      toast.success("Domain order created! Proceed to billing to pay.");
      navigate("/dashboard/billing");
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    }
    setRegistering(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Search Domains</h1>
        <p className="text-sm text-muted-foreground">Find and register your perfect domain name</p>
      </div>

      {/* Search bar */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Enter domain name (e.g. mybusiness)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="accent" onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
            Search
          </Button>
        </div>
      </div>

      {/* Results */}
      {searching && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
          <p className="text-muted-foreground">Checking availability across {tlds.length} extensions...</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold">Results</h2>
          {results.map((r) => (
            <div
              key={r.domain}
              className={`bg-card rounded-xl border p-4 flex items-center justify-between ${
                r.available ? "border-accent/30" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe className={`w-5 h-5 ${r.available ? "text-accent" : "text-muted-foreground"}`} />
                <span className="font-medium">{r.domain}</span>
                <Badge
                  variant="outline"
                  className={r.available ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
                >
                  {r.available ? "Available" : "Taken"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {r.price && <span className="text-sm font-semibold">${r.price}/yr</span>}
                {r.available && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleRegister(r.domain)}
                    disabled={registering === r.domain}
                  >
                    {registering === r.domain ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-1" /> Register
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && results.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">Search for a domain</h3>
          <p className="text-muted-foreground">Enter a domain name above to check availability and pricing.</p>
        </div>
      )}
    </div>
  );
};

export default SearchDomain;
