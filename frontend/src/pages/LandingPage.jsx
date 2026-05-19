// =====================================================================
// frontend/src/pages/LandingPage.jsx — Full marketing landing page
// =====================================================================
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, Cloud, Zap, Shield, Globe, Users,
  ChevronRight, Star, Check, Menu, X, ArrowRight,
  Upload, Cpu, Wifi, BarChart3, Bell, Lock
} from 'lucide-react';

// ── Navbar ────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'glass border-b border-white/10 py-3' : 'bg-transparent py-5'
    }`}>
      <div className="section-container flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-gray-900 dark:text-white">
            Cloud<span className="gradient-text">Print</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'Pricing', 'Testimonials'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
               className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link to="/register" className="btn-primary text-sm px-5 py-2.5">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-lg transition-all duration-200 hover:bg-white/10 text-gray-700 dark:text-gray-400"
                aria-label="Toggle menu">
          {menuOpen
            ? <X className="w-5 h-5" />
            : (
              <span className="flex flex-col gap-1.5">
                <span className="mobile-menu-bar block w-5 h-0.5 bg-gray-700 dark:bg-white rounded-full" />
                <span className="mobile-menu-bar block w-5 h-0.5 bg-gray-700 dark:bg-white rounded-full" />
                <span className="mobile-menu-bar block w-5 h-0.5 bg-gray-700 dark:bg-white rounded-full" />
              </span>
            )
          }
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/10 mt-3 px-6 py-4 flex flex-col gap-4 animate-slide-up">
          {['Features', 'How It Works', 'Pricing', 'Testimonials'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
               onClick={() => setMenuOpen(false)}
               className="text-gray-300 hover:text-white transition-colors py-1">
              {item}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Link to="/login" className="btn-secondary text-center">Sign In</Link>
            <Link to="/register" className="btn-primary text-center justify-center">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-hero-gradient">
      {/* Background orbs */}
      <div className="glow-orb w-96 h-96 bg-primary-500 top-1/4 -left-32" />
      <div className="glow-orb w-80 h-80 bg-accent-500 top-1/3 right-0 opacity-15" />
      <div className="glow-orb w-64 h-64 bg-primary-400 bottom-1/4 left-1/3 opacity-10" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5"
           style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="section-container relative z-10 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-sm font-medium mb-8 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5" />
            Print from anywhere in the world
          </div>

          {/* Headline */}
          <h1 className="hero-heading font-display font-bold text-5xl sm:text-6xl md:text-7xl text-white leading-tight mb-6 animate-fade-in-up delay-100">
            Cloud Printing{' '}
            <span className="gradient-text">Reimagined</span>
            <br />for the Modern Era
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
            Upload documents from anywhere, print to any WiFi-connected printer instantly.
            Real-time tracking, secure transfers, and intelligent queue management.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up delay-300">
            <Link to="/register" className="btn-primary text-base px-8 py-3.5 shadow-glow-lg">
              Start Printing Free <ChevronRight className="w-5 h-5" />
            </Link>
            <a href="#how-it-works" className="btn-secondary text-base px-8 py-3.5">
              Watch Demo
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-in-up delay-400">
            {[['10K+', 'Documents Printed'], ['99.9%', 'Uptime SLA'], ['< 3s', 'Avg Print Time']].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold gradient-text">{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hero illustration — floating printer card */}
        <div className="mt-20 max-w-3xl mx-auto animate-float">
          <div className="glass-card p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Office Laser Pro</p>
                  <p className="text-xs text-gray-500">192.168.1.105</p>
                </div>
              </div>
              <span className="badge-online">● Online</span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: 'Q4_Report.pdf', status: 'completed', user: 'Sarah K.' },
                { name: 'Invoice_2024.pdf', status: 'printing', user: 'Mike R.' },
                { name: 'Presentation.pptx', status: 'pending', user: 'You' },
              ].map(job => (
                <div key={job.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-xs">📄</div>
                    <div>
                      <p className="text-sm text-white font-medium">{job.name}</p>
                      <p className="text-xs text-gray-500">{job.user}</p>
                    </div>
                  </div>
                  <span className={`badge-${job.status}`}>
                    {job.status === 'printing' && <span className="animate-pulse">●</span>}
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-blue-300">Printing Invoice_2024.pdf...</span>
                <span className="text-blue-300">73%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="progress-bar h-full w-[73%] transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────
const features = [
  { icon: Cloud,    color: 'from-primary-500 to-primary-400', title: 'Cloud Storage',         desc: 'Files securely uploaded and stored in the cloud. Access your documents from any device.' },
  { icon: Zap,      color: 'from-accent-500 to-pink-400',     title: 'Instant Printing',       desc: 'Send to printer in under 3 seconds. Real-time status updates via WebSocket.' },
  { icon: Shield,   color: 'from-emerald-500 to-teal-400',    title: 'Enterprise Security',    desc: 'JWT authentication, end-to-end encryption, and role-based access control.' },
  { icon: Globe,    color: 'from-orange-500 to-amber-400',    title: 'Print from Anywhere',    desc: 'Web app, mobile-responsive. Send print jobs from anywhere in the world.' },
  { icon: BarChart3,color: 'from-purple-500 to-violet-400',   title: 'Analytics Dashboard',    desc: 'Track print history, usage stats, and monitor printer health in real time.' },
  { icon: Cpu,      color: 'from-cyan-500 to-blue-400',       title: 'Smart Queue',            desc: 'Intelligent queue management with priority, retry logic, and auto-routing.' },
  { icon: Bell,     color: 'from-yellow-500 to-orange-400',   title: 'Push Notifications',     desc: 'Get notified when your document finishes printing or if an error occurs.' },
  { icon: Users,    color: 'from-rose-500 to-pink-400',       title: 'Multi-User Support',     desc: 'Manage teams, control permissions, and share printers across departments.' },
];

function Features() {
  return (
    <section id="features" className="section-padding bg-surface-800">
      <div className="section-container">
        <div className="text-center mb-16">
          <span className="text-primary-400 text-sm font-semibold tracking-widest uppercase">Features</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mt-3">
            Everything You Need to{' '}
            <span className="gradient-text">Print Smarter</span>
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
            A complete cloud printing ecosystem with enterprise-grade features built for modern teams.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="glass-card-hover p-6">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────
const steps = [
  { step: '01', icon: Upload, title: 'Upload Your Document', desc: 'Drag & drop PDFs, images, or Word docs directly onto the dashboard from any device.' },
  { step: '02', icon: Cloud,  title: 'Select Your Printer',  desc: 'Choose from available WiFi printers. Set copies, paper size, and print options.' },
  { step: '03', icon: Wifi,   title: 'Print Agent Receives',  desc: 'The Python agent on the local machine instantly receives the job via WebSocket.' },
  { step: '04', icon: Printer,title: 'Document Prints',       desc: 'File is sent to the printer. Real-time status updates appear in your dashboard.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding">
      <div className="section-container">
        <div className="text-center mb-16">
          <span className="text-accent-400 text-sm font-semibold tracking-widest uppercase">Process</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mt-3">
            Print in <span className="gradient-text">4 Simple Steps</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ step, icon: Icon, title, desc }, i) => (
            <div key={step} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-primary-500/50 to-transparent z-10" />
              )}
              <div className="glass-card p-6 text-center group hover:shadow-glow transition-all duration-300">
                <div className="text-xs font-bold text-primary-400 tracking-widest mb-4">{step}</div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600/30 to-accent-500/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Starter', price: 'Free', period: 'forever',
    color: 'from-gray-600 to-gray-500',
    features: ['5 prints / month', '1 printer', '10 MB max file', 'Basic analytics', 'Email support'],
    cta: 'Get Started', highlight: false,
  },
  {
    name: 'Pro', price: '$12', period: '/month',
    color: 'from-primary-600 to-accent-500',
    features: ['Unlimited prints', '5 printers', '50 MB max file', 'Advanced analytics', 'Priority support', 'QR sharing', 'Push notifications'],
    cta: 'Start Free Trial', highlight: true,
  },
  {
    name: 'Enterprise', price: '$49', period: '/month',
    color: 'from-accent-500 to-rose-500',
    features: ['Unlimited prints', 'Unlimited printers', '500 MB max file', 'Custom analytics', 'Dedicated support', 'SSO & SAML', 'API access', 'SLA 99.9%'],
    cta: 'Contact Sales', highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="section-padding bg-surface-800">
      <div className="section-container">
        <div className="text-center mb-16">
          <span className="text-primary-400 text-sm font-semibold tracking-widest uppercase">Pricing</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mt-3">
            Simple, <span className="gradient-text">Transparent Pricing</span>
          </h2>
          <p className="text-gray-400 mt-4">No hidden fees. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map(({ name, price, period, color, features, cta, highlight }) => (
            <div key={name} className={`relative glass-card p-7 flex flex-col ${highlight ? 'border-primary-500/50 shadow-glow scale-105' : ''}`}>
              {highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-bold">
                  MOST POPULAR
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5`}>
                <Printer className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-display font-bold gradient-text">{price}</span>
                <span className="text-gray-500 text-sm">{period}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className={highlight ? 'btn-primary justify-center' : 'btn-secondary justify-center'}>
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────
const testimonials = [
  { name: 'Sarah Johnson', role: 'Office Manager, TechCorp', avatar: 'SJ', rating: 5, text: "CloudPrint has completely transformed how our team handles printing. We no longer have to email files to the printer's shared folder. It just works!" },
  { name: 'Marcus Chen', role: 'IT Director, Finova', avatar: 'MC', rating: 5, text: "The real-time queue management and printer monitoring saved us hours per week. The Python agent setup was straightforward and the REST API is clean." },
  { name: 'Priya Sharma', role: 'Freelance Designer', avatar: 'PS', rating: 5, text: "I work remotely but can still send print jobs to my home printer. The QR sharing feature is genius — I just scan and print." },
];

function Testimonials() {
  return (
    <section id="testimonials" className="section-padding">
      <div className="section-container">
        <div className="text-center mb-16">
          <span className="text-accent-400 text-sm font-semibold tracking-widest uppercase">Testimonials</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mt-3">
            Loved by <span className="gradient-text">Thousands</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, avatar, rating, text }) => (
            <div key={name} className="glass-card-hover p-6">
              <div className="flex mb-3">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-5">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                  {avatar}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{name}</p>
                  <p className="text-gray-500 text-xs">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="section-padding bg-surface-800">
      <div className="section-container">
        <div className="relative glass-card p-12 text-center overflow-hidden">
          <div className="glow-orb w-64 h-64 bg-primary-500 -top-20 -left-20" />
          <div className="glow-orb w-64 h-64 bg-accent-500 -bottom-20 -right-20" />
          <div className="relative z-10">
            <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
              Ready to Print <span className="gradient-text">Smarter?</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of teams who've upgraded their printing workflow with CloudPrint.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-base px-8 py-3.5 shadow-glow-lg">
                Start for Free <ChevronRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn-secondary text-base px-8 py-3.5">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="section-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-white">CloudPrint</span>
            </div>
            <p className="text-gray-500 text-sm">Print from anywhere. Instantly.</p>
          </div>
          {[
            { title: 'Product',  links: ['Features', 'Pricing', 'Security', 'Changelog'] },
            { title: 'Company',  links: ['About', 'Blog', 'Careers', 'Press'] },
            { title: 'Support',  links: ['Docs', 'API Reference', 'Status', 'Contact'] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(l => (
                  <li key={l}><a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">© 2024 CloudPrint. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Cookies'].map(item => (
              <a key={item} href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Export ───────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
