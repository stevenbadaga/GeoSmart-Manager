import React from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { publicImages } from '../assets/publicImages'

const iconMap = {
  pin: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.1 7-11.2A7 7 0 005 9.8C5 15.9 12 21 12 21z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16v12H4z" />
      <path d="M4 8l8 5 8-5" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6.5 4h2l1.2 3.2-1.4 1.4a12 12 0 005.1 5.1l1.4-1.4L18 16.5v2a1.5 1.5 0 01-1.6 1.5 14.5 14.5 0 01-9.9-4.6A14.5 14.5 0 012 7.5 1.5 1.5 0 013.5 6h2z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export default function PublicFooter() {
  return (
    <footer className="public-footer w-full bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr] gap-8 md:gap-10 items-start">
          
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <BrandLogo
              to="/"
              src={publicImages.newBlackLogoTransparent}
              alt="GeoSmart Manager footer logo"
              className="w-48 max-w-full"
              imageClassName="h-14 w-auto bg-transparent object-contain border-none shadow-none"
            />
            <p className="text-slate-350 leading-relaxed text-sm max-w-sm">
              Professional GIS-based land planning and subdivision support for Rwanda.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFF3D5] opacity-90">Quick Links</p>
            <ul className="mt-4 space-y-2.5">
              {[
                { text: 'Home', to: '/' },
                { text: 'About', to: '/about' },
                { text: 'Features', to: '/features' },
                { text: 'Contact Us', to: '/contact' }
              ].map((link) => (
                <li key={link.text}>
                  <Link
                    to={link.to}
                    className="text-slate-350 hover:text-[#FFF3D5] transition-all duration-300 hover:translate-x-1 inline-block text-sm"
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Platform Links */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFF3D5] opacity-90">Platform Links</p>
            <ul className="mt-4 space-y-2.5">
              {[
                { text: 'Data & Compliance', to: '/data-compliance' },
                { text: 'Subdivision Support', to: '/subdivision' },
                { text: 'GIS Workspace', to: '/map' },
                { text: 'Reports', to: '/reports' }
              ].map((link) => (
                <li key={link.text}>
                  <Link
                    to={link.to}
                    className="text-slate-350 hover:text-[#FFF3D5] transition-all duration-300 hover:translate-x-1 inline-block text-sm"
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Information */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFF3D5] opacity-90">Contact Information</p>
            <ul className="mt-4 space-y-3">
              {[
                { text: 'Kigali, Rwanda', icon: 'pin', href: 'https://maps.google.com/?q=Kigali,Rwanda' },
                { text: 'badagaclass@gmail.com', icon: 'mail', href: 'mailto:badagaclass@gmail.com' },
                { text: '+25078883986', icon: 'phone', href: 'tel:+25078883986' },
                { text: 'Mon-Fri, 08:00-18:00 CAT', icon: 'clock' }
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 text-emerald-400 shrink-0">{iconMap[item.icon]}</span>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-slate-350 hover:text-[#FFF3D5] transition-colors duration-300"
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-slate-350">{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Section */}
        <div className="border-t border-white/5 mt-8 pt-5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400/60 tracking-wider">
          <p>&copy; {new Date().getFullYear()} GeoSmart Manager. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="opacity-75">Rwanda Land Planning Platform</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
