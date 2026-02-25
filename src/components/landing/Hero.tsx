import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowRight, Zap, Shield, Globe, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = v + suffix;
    });
    return () => { controls.stop(); unsub(); };
  }, [value, suffix]);

  return <span ref={ref}>0{suffix}</span>;
};

const Hero = () => {
  return (
    <section className="relative min-h-screen pt-20 overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-full bg-[var(--gradient-hero)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-accent/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold/6 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-28">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span>Built for Kenyan businesses & developers</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
          >
            Your Websites,{" "}
            <span className="text-gradient">Hosted Right</span>
            <br className="hidden sm:block" />
            <span className="text-muted-foreground text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold">
              {" "}Fast. Reliable. Local.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Professional web hosting with M-Pesa payments, instant setup, free SSL, 
            and a dashboard you'll actually love using.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button variant="hero" size="xl" className="group min-w-[200px]" asChild>
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" className="min-w-[200px]" asChild>
              <a href="#pricing">
                View Plans
              </a>
            </Button>
          </motion.div>

          {/* Quick trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-16"
          >
            {["No credit card required", "Free SSL included", "M-Pesa accepted"].map((text) => (
              <div key={text} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { value: 2500, suffix: "+", label: "Active Websites" },
              { value: 99, suffix: ".9%", label: "Uptime SLA" },
              { value: 24, suffix: "/7", label: "Local Support" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-2xl md:text-4xl font-bold text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
          className="max-w-5xl mx-auto perspective-[1200px]"
        >
          <div className="relative">
            {/* Multi-layer glow */}
            <div className="absolute -inset-4 bg-accent/15 blur-3xl rounded-3xl -z-10" />
            <div className="absolute -inset-1 bg-gradient-to-b from-accent/20 to-transparent rounded-2xl -z-10" />

            {/* Browser frame */}
            <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
              {/* Chrome bar */}
              <div className="bg-secondary/60 px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/50" />
                  <div className="w-3 h-3 rounded-full bg-warning/50" />
                  <div className="w-3 h-3 rounded-full bg-success/50" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background/80 rounded-lg px-4 py-1.5 text-sm text-muted-foreground max-w-md mx-auto flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-accent" />
                    dashboard.vintechs.co.ke
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-5 md:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-base md:text-lg">Welcome back, James 👋</h3>
                    <p className="text-sm text-muted-foreground">Your hosting dashboard</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
                    ● All Systems Operational
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Active Sites", value: "3", icon: "🌐" },
                    { label: "Storage", value: "2.4 GB", icon: "💾" },
                    { label: "Bandwidth", value: "45 GB", icon: "📊" },
                    { label: "Emails", value: "12", icon: "📧" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-secondary/40 rounded-xl p-3 md:p-4 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{stat.icon}</span>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                      <p className="text-xl md:text-2xl font-display font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Mini site list */}
                <div className="bg-secondary/30 rounded-xl border border-border/50 overflow-hidden">
                  {[
                    { name: "mybusiness.co.ke", status: "Live", uptime: "99.9%" },
                    { name: "portfolio.dev", status: "Live", uptime: "100%" },
                    { name: "shop.store", status: "Building", uptime: "—" },
                  ].map((site, i) => (
                    <div key={site.name} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border/50" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${site.status === "Live" ? "bg-success" : "bg-warning animate-pulse"}`} />
                        <span className="text-sm font-medium font-mono">{site.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{site.uptime}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          site.status === "Live" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}>{site.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
