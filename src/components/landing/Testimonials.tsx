import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "James Mwangi",
    role: "Founder, TechBoda",
    content:
      "Switched from a big international host to Vintechs and my site loads 3x faster. M-Pesa payment was a game-changer — no more forex fees.",
    rating: 5,
    avatar: "JM",
  },
  {
    name: "Aisha Mohamed",
    role: "Freelance Developer",
    content:
      "I host 8 client sites on Vintechs. The dashboard is clean, deployments are instant, and support actually replies in minutes, not days.",
    rating: 5,
    avatar: "AM",
  },
  {
    name: "Peter Odhiambo",
    role: "University Student",
    content:
      "The student plan is so affordable. I built my portfolio and got my first freelance gig because my site was actually fast and professional.",
    rating: 5,
    avatar: "PO",
  },
  {
    name: "Faith Wanjiku",
    role: "E-commerce Owner",
    content:
      "My online shop has been running on Vintechs for a year. Zero downtime during Black Friday sale. The SSL and backup features give me peace of mind.",
    rating: 5,
    avatar: "FW",
  },
  {
    name: "David Kimani",
    role: "Digital Agency, NairobiDev",
    content:
      "We migrated 20+ client sites to Vintechs. The white-label dashboard and API access make it easy to manage everything from one place.",
    rating: 5,
    avatar: "DK",
  },
  {
    name: "Grace Njeri",
    role: "Blogger & Content Creator",
    content:
      "WordPress setup took literally one click. My blog loads fast on mobile which is huge since most of my readers are on phones.",
    rating: 5,
    avatar: "GN",
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-3 mb-4">
            Loved by <span className="text-gradient">Kenyan Creators</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't take our word for it — hear from the businesses and developers who trust us.
          </p>
        </motion.div>

        {/* Masonry-style testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl border border-border p-6 hover:border-accent/20 hover:shadow-lg transition-all duration-300 group"
            >
              <Quote className="w-8 h-8 text-accent/20 mb-3 group-hover:text-accent/40 transition-colors" />
              <p className="text-foreground/90 leading-relaxed mb-5 text-sm">
                "{t.content}"
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-gold text-gold" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
