import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";



interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  storage_mb: number;
  bandwidth_mb: number;
  max_domains: number;
  max_email_accounts: number;
  max_databases: number;
  wordpress_enabled: boolean;
}

const BuyHosting = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [domainInput, setDomainInput] = useState("");

  useEffect(() => {
    supabase
      .from("hosting_plans")
      .select("*")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true })
      .then(({ data }) => {
        setPlans((data as Plan[]) || []);
        setLoading(false);
      });
  }, []);

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`);

  const getPrice = (plan: Plan) =>
    billingCycle === "yearly" && plan.price_yearly
      ? plan.price_yearly
      : plan.price_monthly;

  const handleOrder = (plan: Plan) => {
    const domain = domainInput.trim();
    if (!domain) {
      toast.error("Please enter a domain name for your hosting");
      return;
    }
    navigate("/dashboard/checkout", {
      state: {
        planId: plan.id,
        domain,
        billingCycle,
      },
    });
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Buy Hosting</h1>
        <p className="text-sm text-muted-foreground">Choose a hosting plan that fits your needs</p>
      </div>

      {/* Domain input */}
      <div className="bg-card rounded-xl border border-border p-5">
        <Label className="text-sm font-medium">Your Domain Name</Label>
        <p className="text-xs text-muted-foreground mb-2">Enter the domain you want to host. You'll need to point its nameservers to our servers to activate.</p>
        <Input
          placeholder="example.co.ke"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          className="max-w-md"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          After ordering, point your domain's nameservers to: <span className="font-mono font-semibold text-foreground">ns1.vintechdev.store</span> & <span className="font-mono font-semibold text-foreground">ns2.vintechdev.store</span>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === "monthly" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === "yearly" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          Yearly <Badge variant="outline" className="ml-1 text-xs bg-success/10 text-success">Save 20%</Badge>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No plans available</h3>
          <p className="text-muted-foreground">Hosting plans will appear here once configured by admin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border p-6 flex flex-col hover:border-accent/30 hover:shadow-lg transition-all"
            >
              <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
              )}
              <div className="mb-6">
                <span className="text-3xl font-display font-bold">
                  KES {getPrice(plan).toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">/{billingCycle === "yearly" ? "yr" : "mo"}</span>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {[
                  `${formatMb(plan.storage_mb)} Storage`,
                  `${formatMb(plan.bandwidth_mb)} Bandwidth`,
                  `${plan.max_domains} Domain${plan.max_domains > 1 ? "s" : ""}`,
                  `${plan.max_email_accounts} Email Account${plan.max_email_accounts > 1 ? "s" : ""}`,
                  `${plan.max_databases} Database${plan.max_databases > 1 ? "s" : ""}`,
                  ...(plan.wordpress_enabled ? ["WordPress Included"] : []),
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant="accent"
                className="w-full"
                onClick={() => handleOrder(plan)}
                disabled={!domainInput.trim()}
              >
                Order Now
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyHosting;
