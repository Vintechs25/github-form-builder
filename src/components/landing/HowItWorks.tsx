import { motion } from "framer-motion";
import { UserPlus, CreditCard, Rocket, PartyPopper } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up in 30 seconds. No credit card needed to start your free trial.",
    accent: "bg-accent/10 text-accent border-accent/20",
  },
  {
    icon: CreditCard,
    title: "Choose a Plan & Pay",
    description: "Pick the plan that fits. Pay instantly with M-Pesa, card, or bank transfer.",
    accent: "bg-gold/10 text-gold border-gold/20",
  },
  {
    icon: Rocket,
    title: "Launch Your Site",
    description: "Upload files, install WordPress with one click, or connect your GitHub repo.",
    accent: "bg-accent/10 text-accent border-accent/20",
  },
  {
    icon: PartyPopper,
    title: "You're Live!",
    description: "Your site is online with free SSL, email, and our powerful dashboard at your fingertips.",
    accent: "bg-gold/10 text-gold border-gold/20",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 md:py-32 bg-secondary/30 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-3 mb-4">
            Live in <span className="text-gradient">4 Simple Steps</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            From signup to a live website in under 5 minutes. Seriously.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex gap-4 p-6 rounded-2xl bg-card border border-border hover:border-accent/20 hover:shadow-md transition-all duration-300"
              >
                {/* Step number */}
                <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">
                  {i + 1}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${step.accent}`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
