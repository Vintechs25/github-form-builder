import { Server, Mail, Phone, MapPin, Twitter, Instagram, Linkedin, Github } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const footerLinks = {
    product: [
      { label: "Shared Hosting", href: "#pricing" },
      { label: "WordPress Hosting", href: "#pricing" },
      { label: "Application Hosting", href: "#pricing" },
      { label: "Domain Names", href: "#features" },
      { label: "Email Hosting", href: "#features" },
    ],
    company: [
      { label: "About Us", href: "/about" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#support" },
    ],
    support: [
      { label: "Help Center", href: "#support" },
      { label: "Documentation", href: "#" },
      { label: "Status Page", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Privacy Policy", href: "#" },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Server className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-xl">Vintechs</span>
            </Link>
            <p className="text-primary-foreground/60 mb-6 max-w-sm leading-relaxed">
              Professional web hosting built for Kenya. Reliable servers, local payment methods, 
              and a support team that speaks your language.
            </p>
            <div className="space-y-2.5 text-sm text-primary-foreground/60 mb-6">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-accent" />
                <span>support@vintechs.co.ke</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-accent" />
                <span>+254 700 000 000</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-accent" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {[Twitter, Instagram, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center hover:bg-accent hover:border-accent text-primary-foreground/50 hover:text-accent-foreground transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground/90">Products</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/50 hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground/90">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/50 hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground/90">Support</h4>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/50 hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/40">
            © {new Date().getFullYear()} Vintechs Hosting. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-primary-foreground/40">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-accent transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
