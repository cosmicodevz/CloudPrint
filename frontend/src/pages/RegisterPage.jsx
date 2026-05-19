// =====================================================================
// frontend/src/pages/RegisterPage.jsx
// =====================================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const requirements = [
  { label: 'At least 6 characters', test: (p) => p.length >= 6 },
  { label: 'Contains a number',      test: (p) => /\d/.test(p) },
];

export default function RegisterPage() {
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.name.trim())                      e.name     = 'Name required';
    if (!form.email)                            e.email    = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = 'Invalid email';
    if (!form.password)                         e.password = 'Password required';
    else if (form.password.length < 6)          e.password = 'Min 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email, form.password);
      toast.success('Account created! Welcome to CloudPrint 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  const field = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: '' })); };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="glow-orb w-80 h-80 bg-accent-500 top-0 -right-40 opacity-15" />
      <div className="glow-orb w-64 h-64 bg-primary-500 bottom-0 -left-32" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow-lg group-hover:scale-110 transition-transform">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-white">
              Cloud<span className="gradient-text">Print</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">Create your account</h1>
          <p className="text-gray-400 text-sm">Start printing from anywhere in minutes</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label className="input-label">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input id="reg-name" type="text" placeholder="John Doe" value={form.name}
                  onChange={e => field('name', e.target.value)}
                  className={`input pl-10 ${errors.name ? 'input-error' : ''}`}
                  autoComplete="name" autoFocus />
              </div>
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="input-label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input id="reg-email" type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => field('email', e.target.value)}
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  autoComplete="email" />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input id="reg-password" type={show ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password}
                  onChange={e => field('password', e.target.value)}
                  className={`input pl-10 pr-11 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="new-password" />
                <button type="button" onClick={() => setShow(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              {/* Requirements */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  {requirements.map(r => (
                    <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(form.password) ? 'text-green-400' : 'text-gray-500'}`}>
                      <Check className="w-3 h-3" />
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 mt-2">
              {loading ? <span className="spinner" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-5">
            By registering you agree to our{' '}
            <a href="#" className="text-primary-400 hover:underline">Terms</a> and{' '}
            <a href="#" className="text-primary-400 hover:underline">Privacy Policy</a>.
          </p>

          <p className="text-center text-gray-500 text-sm mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
