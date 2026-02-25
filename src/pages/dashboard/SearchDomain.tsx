import { useState, useEffect } from "react";
import { Search, Globe, ShoppingCart, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

interface ContextType { user: User | null; }

interface TldPricing {
  tld: string;
  sell_price_register: number;
  sell_price_renew: number;
}

interface SearchResult {
  domain: string;
  available: boolean;
  price: number | null;
  renewPrice: number | null;
}

const SearchDomain = () => {
  const { user } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [registering, setRegistering] = useState<string | null>(null);
  const [tldPricing, setTldPricing] = useState<TldPricing[]>([]);

  useEffect(() => {
    supabase
      .from("domain_pricing")
      .select("tld, sell_price_register, sell_price_renew")
      .eq("is_enabled", true)
      .order("tld")
      .then(({ data }) => {
        setTldPricing((data as TldPricing[]) || []);
      });
  }, []);

  const getTldPrice = (domain: string): { register: number | null; renew: number | null } => {
    const tld = domain.substring(domain.indexOf("."));
    const match = tldPricing.find((p) => p.tld === tld);
    return match
      ? { register: match.sell_price_register, renew: match.sell_price_renew }
      : { register: null, renew: null };
  };

  const searchTlds = tldPricing.length > 0
    ? tldPricing.slice(0, 10).map((p) => p.tld)
    : [".com", ".net", ".org", ".co.ke", ".ke", ".info"];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSearchedQuery(query.trim());

    const baseName = query.trim().replace(/\.[a-z.]+$/i, "");
    const searchResults: SearchResult[] = [];

    for (const tld of searchTlds) {
      const domain = `${baseName}${tld}`;
      try {
        const { data, error } = await supabase.functions.invoke("namesilo-api", {
          body: { action: "checkAvailability", domain },
        });
        const prices = getTldPrice(domain);
        if (!error && data?.data) {
          searchResults.push({
            domain,
            available: data.data.available || false,
            price: prices.register ?? (data.data.price || null),
            renewPrice: prices.renew,
          });
        } else {
          searchResults.push({ domain, available: false, price: prices.register, renewPrice: prices.renew });
        }
      } catch {
        const prices = getTldPrice(domain);
        searchResults.push({ domain, available: false, price: prices.register, renewPrice: prices.renew });
      }
    }

    setResults(searchResults);
    setSearching(false);
  };

  const handleRegister = async (domain: string) => {
    if (!user) return;
    setRegistering(domain);
    try {
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

      const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const invoiceDesc = `Domain Registration: ${domain}`;
      await supabase.from("invoices").insert({
        user_id: user.id,
        order_id: order.id,
        invoice_number: invNum,
        amount: price,
        status: "unpaid",
        due_date: dueDate,
        description: invoiceDesc,
      });

      supabase.functions.invoke("send-notification-email", {
        body: {
          to: user.email,
          type: "invoice_created",
          data: {
            firstName: null,
            invoiceNumber: invNum,
            amount: price,
            currency: "KES",
            dueDate: new Date(dueDate).toLocaleDateString(),
            description: invoiceDesc,
          },
        },
      }).catch(() => {});

      toast.success("Domain order created! Proceed to billing to pay.");
      navigate("/dashboard/billing");
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    }
    setRegistering(null);
  };

  // Split results: primary = exact match or first available, rest = alternatives
  const primaryResult = results.length > 0
    ? results.find((r) => r.available) || results[0]
    : null;
  const alternativeResults = results.filter((r) => r !== primaryResult);

  return (
    <div className="space-y-6">
      {/* Hero search section */}
      <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
        <Globe className="w-10 h-10 text-accent mx-auto" />
        <h1 className="font-display font-bold text-2xl">Find your perfect domain</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Search for domain availability and register it instantly.
        </p>
        <div className="flex gap-2 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="e.g. mybusiness.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 h-12 text-base"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || !query.trim()} className="h-12 px-6 bg-accent text-accent-foreground hover:bg-accent/90">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {searching && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
          <p className="text-muted-foreground">Checking availability across {searchTlds.length} extensions...</p>
        </div>
      )}

      {/* Primary result - hero card */}
      {!searching && primaryResult && (
        <div
          className={`rounded-2xl border-2 p-6 ${
            primaryResult.available
              ? "border-accent bg-accent/5"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {primaryResult.available ? (
                <CheckCircle2 className="w-8 h-8 text-accent shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-destructive shrink-0" />
              )}
              <div>
                <h2 className="font-display font-bold text-xl">{primaryResult.domain}</h2>
                <p className={`text-sm ${primaryResult.available ? "text-accent" : "text-destructive"}`}>
                  {primaryResult.available
                    ? "Great news! This domain is available."
                    : "Sorry, this domain is already taken."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {primaryResult.price != null && (
                <div className="text-right">
                  <span className="text-2xl font-bold">${primaryResult.price.toFixed(2)}</span>
                  <span className="text-muted-foreground text-sm">/yr</span>
                  {primaryResult.renewPrice != null && primaryResult.renewPrice !== primaryResult.price && (
                    <p className="text-xs text-muted-foreground">Renews at ${primaryResult.renewPrice.toFixed(2)}/yr</p>
                  )}
                </div>
              )}
              {primaryResult.available && (
                <Button
                  onClick={() => handleRegister(primaryResult.domain)}
                  disabled={registering === primaryResult.domain}
                  className="h-11 px-5 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {registering === primaryResult.domain ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><ShoppingCart className="w-4 h-4 mr-2" />Register Now</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alternative results */}
      {!searching && alternativeResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            More options for "{searchedQuery.replace(/\.[a-z.]+$/i, "")}"
          </h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            {alternativeResults.map((r) => (
              <div key={r.domain} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className={`w-4 h-4 ${r.available ? "text-accent" : "text-muted-foreground"}`} />
                  <span className="font-medium">{r.domain}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      r.available
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {r.available ? "Available" : "Taken"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  {r.price != null && (
                    <div className="text-right">
                      <span className="text-sm font-semibold">${r.price.toFixed(2)}/yr</span>
                      {r.renewPrice != null && r.renewPrice !== r.price && (
                        <span className="text-xs text-muted-foreground block">Renew ${r.renewPrice.toFixed(2)}/yr</span>
                      )}
                    </div>
                  )}
                  {r.available && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegister(r.domain)}
                      disabled={registering === r.domain}
                      className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                    >
                      {registering === r.domain ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <><ShoppingCart className="w-3 h-3 mr-1" />Add</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">Type a domain name above and hit search to get started.</p>
        </div>
      )}
    </div>
  );
};

export default SearchDomain;
