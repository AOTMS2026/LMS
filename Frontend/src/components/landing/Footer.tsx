import logo from "@/assets/aliet_logo.png";
import {
  Linkedin,
  Instagram,
  Facebook,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Compass,
  ExternalLink,
  Youtube,
} from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  const links = {
    Platform: [
      "Live Classes",
      "Recorded Videos",
      "Secure Exams",
      "Leaderboard",
      "ATS Resume Score",
    ],
    Company: ["About Us", "Our Trainers", "Careers", "Press"],
    Support: [
      "FAQ",
      "Documentation",
      "Contact Us",
      "Privacy Policy",
      "Terms of Service",
    ],
  };

  const supportLinks: { [key: string]: string } = {
    // Support
    FAQ: "/faq",
    Documentation: "/docs",
    "Contact Us": "/contact",
    "Privacy Policy": "/privacy",
    "Terms of Service": "/terms",

    // Company
    "About Us": "/#about",
    "Our Trainers": "/trainers",
    Careers: "/careers",
    Press: "/press",

    // Platform
    "Live Classes": "/features#live",
    "Recorded Videos": "/features#recorded",
    "Secure Exams": "/features#exams",
    Leaderboard: "/features#leaderboard",
    "ATS Resume Score": "/features#resume",
  };

  const socials = [
    {
      icon: Linkedin,
      href: "https://www.linkedin.com/in/academy-of-tech-masters-aotms-82274537a/",
      label: "LinkedIn",
      color: "#0077b5",
    },
    {
      icon: Instagram,
      href: "https://www.instagram.com/academyoftechmasters?igsh=enZ5YjYwOXg1cW80&utm_source=qr",
      label: "Instagram",
      color: "#E4405F",
    },
    {
      icon: Youtube,
      href: "https://www.youtube.com/channel/UC5n8RN-p7ez3i39CCy85OWA",
      label: "YouTube",
      color: "#FF0000",
    },
    {
      icon: Mail,
      href: "mailto:Info@aotms.in",
      label: "Email",
      color: "#FD5A1A",
    },
  ];

  return (
    <footer
      id="contact"
      className="relative bg-[#0075CF] text-[#FDFEFE] overflow-hidden"
    >
      {/* Background shards/abstract shapes for depth */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 1200 800"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0,0 L400,0 L0,400 Z" fill="white" />
          <path d="M1200,800 L800,800 L1200,400 Z" fill="white" />
          <path d="M0,800 L300,500 L0,200 Z" fill="#FD5A1A" />
        </svg>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="inline-block bg-white px-6 py-3 rounded-xl mb-6 shadow-lg">
              <img src={logo} alt="AOTMS Logo" className="h-20 w-auto" />
            </div>
            <p className="text-[#FDFEFE]/85 text-sm md:text-base leading-relaxed mb-6 max-w-sm font-medium">
              Vijayawada's premier LMS platform for skill-based learning, secure
              exams, and 100% placement support.
            </p>
            {/* Contact info */}
            <div className="flex flex-col gap-3">
              <a
                href="tel:+918019952233"
                className="flex items-center gap-2 text-[#FDFEFE]/90 hover:text-white font-semibold text-sm transition-colors"
              >
                <Phone className="w-4 h-4 text-[#FD5A1A] flex-shrink-0" /> (+91)
                80199 52233
              </a>
              <a
                href="mailto:Info@aotms.in"
                className="flex items-center gap-2 text-[#FDFEFE]/90 hover:text-white font-semibold text-sm transition-colors"
              >
                <Mail className="w-4 h-4 text-[#FD5A1A] flex-shrink-0" />{" "}
                Info@aotms.in
              </a>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 text-[#FDFEFE]/85 font-medium text-sm">
                  <MapPin className="w-4 h-4 text-[#FD5A1A] flex-shrink-0 mt-0.5" />
                  <span>
                    2nd Floor, Pothuri Towers, MG Rd, near DV Manor Hotel,
                    Chandra Mouli Puram, Sriram Nagar, Vijayawada, Andhra
                    Pradesh 520010
                  </span>
                </div>
                <a
                  href="https://maps.app.goo.gl/TfWZLrSgHVzRruKv7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 ml-6 text-[#FD5A1A] hover:text-white text-xs font-black uppercase tracking-widest transition-all group"
                >
                  <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  Get Directions
                </a>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-black text-[#FDFEFE] text-[15px] uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#FD5A1A] rounded-full" />
                {title}
              </h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href={supportLinks[item] || "#"}
                      target="_self"
                      className="text-[#FDFEFE]/85 hover:text-white font-medium text-sm transition-colors leading-relaxed"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter Banner */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <p className="font-black text-[#FDFEFE] text-lg mb-1">
                Stay updated with AOTMS
              </p>
              <p className="text-[#FDFEFE]/90 text-sm font-medium">
                Get course updates, placement news & tech tips weekly.
              </p>
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 sm:w-64 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-[#FDFEFE] placeholder-[#FDFEFE]/40 text-sm focus:outline-none focus:border-[#FD5A1A] transition-colors"
              />
               <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FD5A1A] to-[#FF7A00] text-[#FDFEFE] font-bold text-sm transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <p className="text-[#FDFEFE]/75 text-sm font-medium">
              © {year} AOTMS. All rights reserved.
            </p>
            <div className="hidden sm:block h-4 w-px bg-white/20" />
            <p className="text-[#FDFEFE]/60 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
              <span className="hidden sm:block w-4 h-[1px] bg-[#FD5A1A]" />
              Designed & Developed By <span className="text-[#FDFEFE] border-b border-[#FD5A1A]/40 pb-0.5 tracking-normal normal-case font-bold">Team AOTMS</span>
            </p>
          </div>
          <div className="flex gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-11 h-11 rounded-full bg-[#FDFEFE] flex items-center justify-center shadow-lg hover:shadow-white/20 hover:-translate-y-1.5 transition-all duration-300 group active:scale-90"
              >
                <s.icon
                  className="w-5 h-5 transition-all duration-300"
                  style={{ color: s.color }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;