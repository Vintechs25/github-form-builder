import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found.");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paystack/verify", {
          body: { reference },
        });

        if (error) throw new Error(error.message);

        if (data?.paid) {
          setStatus("success");
          setMessage("Payment confirmed! Your service is being provisioned.");
        } else {
          setStatus("failed");
          setMessage("Payment was not completed. Please try again.");
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        setStatus("failed");
        setMessage(err.message || "Failed to verify payment.");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card rounded-xl border border-border p-8 text-center max-w-md w-full space-y-4">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="font-display font-semibold text-lg">Verifying Payment...</h2>
            <p className="text-muted-foreground text-sm">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h2 className="font-display font-semibold text-lg">Payment Successful!</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
            <Button onClick={() => navigate("/dashboard/billing")} className="mt-4">
              View Invoices
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="font-display font-semibold text-lg">Payment Failed</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
            <Button onClick={() => navigate("/dashboard/billing")} variant="outline" className="mt-4">
              Back to Billing
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
