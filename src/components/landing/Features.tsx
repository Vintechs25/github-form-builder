import { motion } from "framer-motion";
import {
  Server,
  Globe,
  Shield,
  Zap,
  Database,
  Mail,
  Upload,
  CreditCard,
  Smartphone,
  GitBranch,
  BarChart3,
  Headphones,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Blazing Fast Servers",
    description:
      "OpenLiteSpeed powered hosting with SSD storage for sub-second load times.",
  },
  {
    icon: Shield,
    title: "Free SSL & Security",
    description:
      "Auto-provisioned SSL certificates, DDoS protection, and firewall rules included.",
  },
  {
    icon: Server,
    title: "One-Click WordPress",
    description:
      "Install WordPress, staging environments, and themes with a single click.",
  },
  {
    icon: CreditCard,
    title: "M-Pesa & Card Payments",
    description:
      "Pay with M-Pesa, Visa, Mastercard, or bank transfer. No forex fees.",
  },
  {
    icon: Globe,
    title: "Domain Registration",
    description:
      "Register .co.ke, .com, .org domains directly from your dashboard.",
  },
  {
    icon: Mail,
    title: "Professional Email",
    description:
      "Custom email accounts with your domain. Webmail included for free.",
  },
  {
    icon: GitBranch,
    title: "Git Deployments",
    description:
      "Connect GitHub repos and auto-deploy on push. Perfect for developers.",
  },
  {
    icon: Database,
    title: "MySQL & phpMyAdmin",
    description:
      "Full database access with phpMyAdmin for complete data control.",
  },
  {
    icon: Upload,
    title: "File Manager & FTP",
    description:
      "Browser-based file manager or connect via FTP. Your choice.",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    description:
      "Real-time bandwidth, storage, and visitor stats on your dashboard.",
  },
  {
    icon: Smartphone,
    title: "Mobile-Ready Dashboard",
    description:
      "Manage your hosting from any device with our responsive dashboard.",
  },
  {
    icon: Headphones,
    title: "24/7 Kenyan Support",
    description:
      "Local support team that responds in minutes, not days. Via WhatsApp too.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Features = () => {
  return (
    <section id="features" className="py-20 md:py-32 relative">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-3 mb-4">
            Everything You Need to{" "}
            <span className="text-gradient">Succeed Online</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Powerful hosting features built for Kenyan businesses and developers.
            No compromises.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group p-5 rounded-2xl bg-card border border-border hover:border-accent/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-base mb-1.5">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
