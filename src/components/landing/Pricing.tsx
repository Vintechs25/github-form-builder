import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    description: "Perfect for students & personal projects",
    priceMonthly: "500",
    priceYearly: "4,500",
    popular: false,
    features: [
      "1 Website",
      "5 GB SSD Storage",
      "50 GB Bandwidth",
      "Free SSL Certificate",
      "1 Email Account",
      "FTP Access",
      "24/7 Support",
    ],
  },
  {
    name: "Business",
    description: "For small businesses & growing websites",
    priceMonthly: "1,500",
    priceYearly: "13,500",
    popular: true,
    features: [
      "5 Websites",
      "25 GB SSD Storage",
      "200 GB Bandwidth",
      "Free SSL Certificate",
      "10 Email Accounts",
      "WordPress Included",
      "Daily Backups",
      "Priority Support",
    ],
  },
  {
    name: "Professional",
    description: "For agencies & high-traffic sites",
    priceMonthly: "3,500",
    priceYearly: "31,500",
    popular: false,
    features: [
      "Unlimited Websites",
      "100 GB SSD Storage",
      "Unlimited Bandwidth",
      "Free SSL Certificate",
      "Unlimited Emails",
      "WordPress + Staging",
      "Hourly Backups",
      "Dedicated Support",
      "Free Domain (.co.ke)",
      "Git Deployments",
    ],
  },
];

const Pricing = () => {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-32 bg-secondary/30 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-3 mb-4">
            Simple, Transparent{" "}
            <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            No hidden fees. Pay with M-Pesa or card. Upgrade or cancel anytime.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${yearly ? "bg-accent" : "bg-border"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-md transition-transform duration-300 ${yearly ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
            Yearly
            <span className="ml-1.5 text-accent text-xs font-semibold">Save 25%</span>
          </span>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-300 ${
                plan.popular
                  ? "bg-primary text-primary-foreground shadow-xl ring-2 ring-accent/50 scale-[1.03]"
                  : "bg-card border border-border hover:border-accent/20 hover:shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold shadow-lg">
                    <Zap className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                <p className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">KES</span>
                  <span className="font-display text-4xl font-bold">
                    {yearly ? plan.priceYearly : plan.priceMonthly}
                  </span>
                  <span className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    /{yearly ? "year" : "month"}
                  </span>
                </div>
                {yearly && (
                  <p className={`text-xs mt-1 ${plan.popular ? "text-accent" : "text-accent"}`}>
                    That's KES {Math.round(parseInt(plan.priceYearly.replace(",", "")) / 12).toLocaleString()}/mo
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.popular ? "text-accent" : "text-accent"}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "accent" : "outline"}
                className={`w-full group ${plan.popular ? "shadow-lg" : ""}`}
                size="lg"
                asChild
              >
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Payment methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground text-sm">
            Pay securely with{" "}
            <span className="font-semibold text-foreground">M-Pesa</span>,{" "}
            <span className="font-semibold text-foreground">Visa</span>,{" "}
            <span className="font-semibold text-foreground">Mastercard</span>, or{" "}
            <span className="font-semibold text-foreground">Bank Transfer</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
