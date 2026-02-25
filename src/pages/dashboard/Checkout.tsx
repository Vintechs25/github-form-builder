import { useState, useEffect } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, ShoppingCart, Globe, Server, Calendar, CreditCard,
  ArrowUpCircle, ArrowRight, Check, X, HardDrive, Wifi, Mail, Database, Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

interface CheckoutState {
  planId: string;
  domain: string;
  billingCycle: "monthly" | "yearly";
  isUpgrade?: boolean;
  existingAccountId?: string | null;
}

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

const Checkout = () => {
  const { user } = useOutletContext<ContextType>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [oldPlan, setOldPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const formatMb = (mb: number) =>
    mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;

  useEffect(() => {
    if (!state?.planId) {
      navigate("/dashboard/buy-hosting", { replace: true });
      return;
    }

    const fetchPlan = supabase
      .from("hosting_plans")
      .select("*")
      .eq("id", state.planId)
      .single();

    // If upgrade, also fetch the old plan
    const fetchOldPlan = state.isUpgrade && state.existingAccountId
      ? supabase
          .from("hosting_accounts")
          .select("plan_id")
          .eq("id", state.existingAccountId)
          .single()
          .then(({ data }) => {
            if (data?.plan_id) {
              return supabase.from("hosting_plans").select("*").eq("id", data.plan_id).single();
            }
            return { data: null, error: null };
          })
      : Promise.resolve({ data: null, error: null });

    Promise.all([fetchPlan, fetchOldPlan]).then(([newRes, oldRes]) => {
      if (newRes.error || !newRes.data) {
        toast.error("Plan not found");
        navigate("/dashboard/buy-hosting", { replace: true });
        return;
      }
      setPlan(newRes.data as Plan);
      if (oldRes.data) setOldPlan(oldRes.data as Plan);
      setLoading(false);
    });
  }, [state, navigate]);

  if (!state || loading || !plan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isUpgrade = state.isUpgrade && oldPlan;

  const price =
    state.billingCycle === "yearly" && plan.price_yearly
      ? plan.price_yearly
      : plan.price_monthly;

  const handlePay = async () => {
    if (!user) return;
    setPaying(true);

    try {
      // 1. Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          type: state.isUpgrade ? "upgrade" : "hosting",
          total_amount: price,
          status: "pending",
          plan_id: plan.id,
          billing_cycle: state.billingCycle,
          domain_name: state.domain,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // 2. Create invoice
      const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const desc = `${plan.name} Hosting - ${state.billingCycle} - ${state.domain}`;

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          order_id: order.id,
          invoice_number: invNum,
          amount: price,
          status: "unpaid",
          due_date: dueDate,
          description: desc,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      if (state.isUpgrade && state.existingAccountId) {
        await supabase
          .from("hosting_accounts")
          .update({ plan_id: plan.id })
          .eq("id", state.existingAccountId);
      } else {
        const { error: hostErr } = await supabase.from("hosting_accounts").insert({
          user_id: user.id,
          domain: state.domain,
          plan_id: plan.id,
          status: "pending_dns",
          hosting_type: plan.wordpress_enabled ? "wordpress" : "file_upload",
        });
        if (hostErr) console.error("Hosting account creation error:", hostErr);

        const { data: existingDomain } = await supabase
          .from("domains")
          .select("id")
          .eq("domain_name", state.domain)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existingDomain) {
          await supabase.from("domains").insert({
            user_id: user.id,
            domain_name: state.domain,
            domain_type: "primary",
            status: "pending",
          });
        }
      }

      // Send invoice email
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
            description: desc,
          },
        },
      }).catch(() => {});

      // Initialize Paystack payment
      const callbackUrl = `${window.location.origin}/dashboard/payment-callback`;
      const { data: paystackData, error: paystackErr } = await supabase.functions.invoke(
        "paystack/initialize",
        { body: { invoice_id: invoice.id, callback_url: callbackUrl } }
      );
      if (paystackErr) throw paystackErr;

      if (paystackData?.authorization_url) {
        window.location.href = paystackData.authorization_url;
      } else {
        throw new Error("Could not initialize payment gateway");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Failed to process checkout");
      setPaying(false);
    }
  };

  // Comparison row helper
  const CompareRow = ({
    label,
    icon: Icon,
    oldVal,
    newVal,
  }: {
    label: string;
    icon: React.ElementType;
    oldVal: string | number;
    newVal: string | number;
  }) => {
    const improved = String(newVal) !== String(oldVal);
    return (
      <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground line-through">{oldVal}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className={`font-medium ${improved ? "text-accent" : ""}`}>{newVal}</span>
          {improved && <Check className="w-3.5 h-3.5 text-accent" />}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg flex items-center gap-2">
          {isUpgrade ? <ArrowUpCircle className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
          {isUpgrade ? "Confirm Upgrade" : "Checkout"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isUpgrade ? "Review the changes to your hosting plan" : "Review your order and complete payment"}
        </p>
      </div>

      {/* Upgrade comparison card */}
      {isUpgrade && oldPlan && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Plan Comparison
              <Badge className="bg-accent/10 text-accent border-accent/20 text-xs ml-auto">Upgrade</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">{oldPlan.name}</Badge>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <Badge className="bg-accent text-accent-foreground text-xs">{plan.name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <CompareRow label="Storage" icon={HardDrive} oldVal={formatMb(oldPlan.storage_mb)} newVal={formatMb(plan.storage_mb)} />
              <CompareRow label="Bandwidth" icon={Wifi} oldVal={formatMb(oldPlan.bandwidth_mb)} newVal={formatMb(plan.bandwidth_mb)} />
              <CompareRow label="Domains" icon={Globe} oldVal={oldPlan.max_domains} newVal={plan.max_domains} />
              <CompareRow label="Emails" icon={Mail} oldVal={oldPlan.max_email_accounts} newVal={plan.max_email_accounts} />
              <CompareRow label="Databases" icon={Database} oldVal={oldPlan.max_databases} newVal={plan.max_databases} />
              <CompareRow
                label="WordPress"
                icon={Layout}
                oldVal={oldPlan.wordpress_enabled ? "Yes" : "No"}
                newVal={plan.wordpress_enabled ? "Yes" : "No"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Server className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{isUpgrade ? "New Plan" : "Plan"}</span>
            </div>
            <span className="font-medium">{plan.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Domain</span>
            </div>
            <span className="font-medium font-mono text-sm">{state.domain}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Billing Cycle</span>
            </div>
            <span className="font-medium capitalize">{state.billingCycle}</span>
          </div>

          {!isUpgrade && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{formatMb(plan.storage_mb)} Storage · {formatMb(plan.bandwidth_mb)} Bandwidth</p>
              <p>{plan.max_domains} Domain{plan.max_domains > 1 ? "s" : ""} · {plan.max_email_accounts} Email{plan.max_email_accounts > 1 ? "s" : ""} · {plan.max_databases} DB{plan.max_databases > 1 ? "s" : ""}</p>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-display font-bold">
              KES {price.toLocaleString()}
              <span className="text-sm text-muted-foreground font-normal">
                /{state.billingCycle === "yearly" ? "yr" : "mo"}
              </span>
            </span>
          </div>

          <Button
            className="w-full mt-2"
            variant="accent"
            size="lg"
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {isUpgrade ? "Confirm & Pay" : "Pay Now"}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Paystack
          </p>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => navigate("/dashboard/buy-hosting")}
        disabled={paying}
      >
        ← Back to Plans
      </Button>
    </div>
  );
};

export default Checkout;
