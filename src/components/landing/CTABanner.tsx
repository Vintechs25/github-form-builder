import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTABanner = () => {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-primary" />
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--accent) / 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(var(--gold) / 0.3) 0%, transparent 50%)`,
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6 border border-accent/30"
            >
              <Sparkles className="w-4 h-4" />
              Limited offer — 30 days free on all plans
            </motion.div>

            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
              Ready to get your website<br className="hidden sm:block" /> online today?
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-8">
              Join thousands of Kenyan businesses already hosting with us. Setup takes under 5 minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="xl"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl hover:-translate-y-1 font-bold transition-all duration-300 min-w-[200px] group"
                asChild
              >
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                size="xl"
                variant="glass"
                className="min-w-[200px]"
                asChild
              >
                <a href="#pricing">Compare Plans</a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTABanner;
