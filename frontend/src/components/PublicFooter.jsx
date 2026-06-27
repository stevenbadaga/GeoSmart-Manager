import React from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { publicImages } from '../assets/publicImages'

const iconMap = {
  pin: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 21s7-5.1 7-11.2A7 7 0 005 9.8C5 15.9 12 21 12 21z" />
      <circle cx="12" cy="9" r="2.3" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 6h16v12H4z" />
      <path d="M4 8l8 5 8-5" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6.5 4h2l1.2 3.2-1.4 1.4a12 12 0 005.1 5.1l1.4-1.4L18 16.5v2a1.5 1.5 0 01-1.6 1.5 14.5 14.5 0 01-9.9-4.6A14.5 14.5 0 012 7.5 1.5 1.5 0 013.5 6h2z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export default function PublicFooter() {
  return (
    <footer className="public-footer w-full bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14 items-start">
          
          {/* Column 1: Brand */}
          <div className="space-y-6">
            <BrandLogo
              to="/"
              src={publicImages.newBlackLogoTransparent}
              alt="GeoSmart Manager footer logo"
              className="w-48 sm:w-52 lg:w-60 max-w-full"
              imageClassName="h-20 w-auto bg-transparent object-contain border-none shadow-none"
            />
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed text-sm">
                Professional GIS-based land planning and subdivision support for Rwanda.
              </p>
            </div>
          </div>

          {/* Column 2: GeoSmart Manager */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">GeoSmart Manager</p>
            <ul className="mt-6 space-y-3">
              {[
                { text: 'Home', to: '/' },
                { text: 'Features', to: '/features' },
                { text: 'How It Works', to: '/features#how-it-works' },
                { text: 'About', to: '/about' },
                { text: 'Contact', to: '/contact' }
              ].map((link) => (
                <li key={link.text}>
                  <Link to={link.to} className="text-slate-300 hover:text-white transition-colors text-sm">
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Planning Support */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Planning Support</p>
            <ul className="mt-6 space-y-3">
              {[
                { text: 'Data & Compliance', to: '/data-compliance' },
                { text: 'Subdivision Support', to: '/subdivision' },
                { text: 'GIS Workspace', to: '/map' },
                { text: 'Reports', to: '/reports' }
              ].map((link) => (
                <li key={link.text}>
                  <Link to={link.to} className="text-slate-300 hover:text-white transition-colors text-sm">
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Information */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Contact Information</p>
            <ul className="mt-6 space-y-4">
              {[
                { text: 'Kigali, Rwanda', icon: 'pin', href: 'https://maps.google.com/?q=Kigali,Rwanda' },
                { text: 'badagaclass@gmail.com', icon: 'mail', href: 'mailto:badagaclass@gmail.com' },
                { text: '+25078883986', icon: 'phone', href: 'tel:+25078883986' },
                { text: 'Mon-Fri, 08:00-18:00 CAT', icon: 'clock' }
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 text-emerald-400/80">{iconMap[item.icon]}</span>
                  {item.href ? (
                    <a href={item.href} className="text-slate-300 hover:text-white transition-colors" target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-slate-300">{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} GeoSmart Manager. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
