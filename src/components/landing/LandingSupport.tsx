import { motion } from "framer-motion";
import { MessageSquare, Mail, Phone, Clock, ArrowRight, HelpCircle, BookOpen, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const channels = [
  {
    icon: Headphones,
    title: "Live Support",
    desc: "Chat with our team in real-time through the dashboard ticketing system.",
    action: "Open a Ticket",
    href: "/signup",
    highlight: true,
  },
  {
    icon: Mail,
    title: "Email Us",
    desc: "Send us an email and we'll get back to you within 2 hours.",
    action: "support@vintechs.co.ke",
    href: "mailto:support@vintechs.co.ke",
    highlight: false,
  },
  {
    icon: Phone,
    title: "Call Us",
    desc: "Speak directly with a support engineer during business hours.",
    action: "+254 700 000 000",
    href: "tel:+254700000000",
    highlight: false,
  },
];

const faqs = [
  { q: "How quickly will I get a response?", a: "Our average response time is under 2 hours. Urgent tickets are prioritized and typically answered within 30 minutes." },
  { q: "Do you offer migration help?", a: "Yes! We'll migrate your website from any other host for free. Just open a ticket and our team handles everything." },
  { q: "What payment methods do you accept?", a: "We accept M-Pesa, bank transfers, and card payments through our secure payment gateway." },
  { q: "Is there a money-back guarantee?", a: "Absolutely. We offer a 30-day money-back guarantee on all hosting plans, no questions asked." },
];

const LandingSupport = () => {
  return (
    <section id="support" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.04),transparent_60%)]" />
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-5">
            <HelpCircle className="w-3.5 h-3.5" />
            We're here for you
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl mb-4">
            Help When You <span className="text-accent">Need It</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Real humans, local expertise, and fast responses — not chatbots and endless hold queues.
          </p>
        </motion.div>

        {/* Support channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {channels.map((ch, i) => (
            <motion.div
              key={ch.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`rounded-2xl border p-7 transition-all hover:shadow-lg group ${
                ch.highlight
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-accent/20"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                ch.highlight
                  ? "bg-accent text-accent-foreground"
                  : "bg-accent/10 text-accent group-hover:bg-accent/20"
              } transition-colors`}>
                <ch.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">{ch.title}</h3>
              <p className={`text-sm leading-relaxed mb-5 ${
                ch.highlight ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}>
                {ch.desc}
              </p>
              {ch.href.startsWith("/") ? (
                <Button
                  variant={ch.highlight ? "accent" : "outline"}
                  size="sm"
                  asChild
                  className={ch.highlight ? "bg-accent-foreground text-accent hover:bg-accent-foreground/90" : ""}
                >
                  <Link to={ch.href}>
                    {ch.action} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
              ) : (
                <a
                  href={ch.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    ch.highlight ? "text-accent-foreground/80 hover:text-accent-foreground" : "text-accent hover:text-accent/80"
                  }`}
                >
                  {ch.action} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20"
        >
          {[
            { icon: Clock, value: "< 2 hrs", label: "Avg Response Time" },
            { icon: MessageSquare, value: "98%", label: "Satisfaction Rate" },
            { icon: BookOpen, value: "50+", label: "Help Articles" },
            { icon: Headphones, value: "24/7", label: "Ticket Support" },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border p-5 text-center">
              <stat.icon className="w-5 h-5 text-accent mx-auto mb-2" />
              <p className="font-display font-bold text-2xl">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h3 className="font-display font-bold text-2xl md:text-3xl text-center mb-10">
            Frequently Asked Questions
          </h3>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.details
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="bg-card rounded-xl border border-border group"
              >
                <summary className="cursor-pointer p-5 font-medium text-sm flex items-center justify-between list-none hover:bg-secondary/50 rounded-xl transition-colors">
                  {faq.q}
                  <span className="text-muted-foreground ml-4 shrink-0 transition-transform group-open:rotate-45 text-lg">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3 -mt-1">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingSupport;
