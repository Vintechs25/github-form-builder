import { motion } from "framer-motion";
import {
  Server, Users, Globe, Shield, Zap, Heart,
  MapPin, Target, Eye, Award, CheckCircle2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const stats = [
  { value: "5,000+", label: "Active Websites", icon: Globe },
  { value: "99.9%", label: "Uptime Guarantee", icon: Zap },
  { value: "24/7", label: "Local Support", icon: Users },
  { value: "2min", label: "Avg Response Time", icon: Shield },
];

const values = [
  {
    icon: Target,
    title: "Reliability First",
    desc: "Every decision we make is measured against uptime. Your website staying online is our number one priority.",
  },
  {
    icon: Heart,
    title: "Built for Africa",
    desc: "We understand the unique challenges of hosting in the region — from payment methods to latency optimization.",
  },
  {
    icon: Eye,
    title: "Transparent Pricing",
    desc: "No hidden fees, no surprise renewals at inflated rates. What you see is what you pay, always.",
  },
  {
    icon: Award,
    title: "Customer Obsessed",
    desc: "We measure success by how quickly and effectively we solve your problems. Every ticket matters.",
  },
];

const timeline = [
  { year: "2022", title: "Founded in Nairobi", desc: "Started with a mission to provide world-class hosting with local expertise." },
  { year: "2023", title: "1,000 Customers", desc: "Reached our first major milestone and launched domain registration services." },
  { year: "2024", title: "Platform Overhaul", desc: "Rebuilt our entire platform for speed, security, and a seamless user experience." },
  { year: "2025", title: "Scaling Up", desc: "Expanding infrastructure and adding application hosting for developers." },
];

const team = [
  { name: "Victor Mwangi", role: "Founder & CEO", initials: "VM" },
  { name: "Amina Odhiambo", role: "Head of Engineering", initials: "AO" },
  { name: "Brian Kimani", role: "Infrastructure Lead", initials: "BK" },
  { name: "Faith Wanjiku", role: "Customer Success", initials: "FW" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.06),transparent_60%)]" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
              <MapPin className="w-3.5 h-3.5" />
              Proudly Kenyan
            </div>
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
              Hosting That Understands{" "}
              <span className="text-accent">Your Market</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              We built Vintechs because businesses in East Africa deserve hosting infrastructure 
              that's fast, reliable, and backed by a team that speaks their language.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-card rounded-2xl border border-border p-6 text-center hover:border-accent/20 hover:shadow-md transition-all"
              >
                <stat.icon className="w-6 h-6 text-accent mx-auto mb-3" />
                <p className="font-display font-bold text-3xl mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-6">Our Mission</h2>
            <p className="text-lg text-primary-foreground/70 leading-relaxed">
              To democratize premium web hosting across Africa by combining world-class infrastructure 
              with local payment options, Swahili & English support, and pricing that respects the 
              realities of doing business in this region.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">What We Stand For</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Four principles that guide every decision at Vintechs.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-card rounded-2xl border border-border p-6 hover:border-accent/20 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <v.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-secondary/50">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">Our Journey</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">From a small idea to thousands of websites.</p>
          </motion.div>
          <div className="max-w-2xl mx-auto">
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex gap-6 mb-8 last:mb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-display font-bold text-sm shrink-0">
                    {item.year.slice(2)}
                  </div>
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="pb-8">
                  <p className="text-xs text-accent font-semibold mb-1">{item.year}</p>
                  <h3 className="font-display font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">Meet the Team</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A lean, passionate crew dedicated to keeping your websites online.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="text-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 font-display font-bold text-xl group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                  {member.initials}
                </div>
                <h3 className="font-display font-semibold text-sm">{member.name}</h3>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            {...fadeUp}
            className="bg-primary rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.15),transparent_60%)]" />
            <div className="relative">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-primary-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-primary-foreground/60 max-w-md mx-auto mb-8">
                Join thousands of Kenyan businesses already hosted on Vintechs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="accent" size="lg" asChild>
                  <Link to="/signup">
                    Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
