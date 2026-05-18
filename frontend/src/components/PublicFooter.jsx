import React from 'react'
import { Link } from 'react-router-dom'

const social = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: 'in' },
  { label: 'Twitter', href: 'https://twitter.com', icon: 'tw' },
  { label: 'GitHub', href: 'https://github.com', icon: 'gh' },
  { label: 'YouTube', href: 'https://youtube.com', icon: 'yt' }
]

const columns = [
  {
    title: 'Platform',
    links: [
      { text: 'AI Subdivision', to: '/subdivision' },
      { text: 'Compliance Checks', to: '/compliance' },
      { text: 'Project Hub', to: '/projects' },
      { text: 'Map Workspace', to: '/map' }
    ]
  },
  {
    title: 'Solutions',
    links: [
      { text: 'Urban Planning', to: '/solutions#urban-planning' },
      { text: 'Land Tenure Digitization', to: '/solutions#land-tenure' },
      { text: 'Municipal Review', to: '/solutions#municipal-review' },
      { text: 'Geospatial Analytics', to: '/solutions#geospatial-analytics' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { text: 'Product Guide', to: '/resources#product-guide' },
      { text: 'Security Brief', to: '/resources#security' },
      { text: 'Release Notes', to: '/resources#release-notes' },
      { text: 'Support Center', to: '/resources#support' }
    ]
  },
  {
    title: 'Contact',
    links: [
      { text: 'Kigali, Rwanda', icon: 'pin', href: 'https://maps.google.com/?q=Kigali,Rwanda' },
      { text: 'hello@geosmart.rw', icon: 'mail', href: 'mailto:hello@geosmart.rw' },
      { text: '0788883986', icon: 'phone', href: 'tel:0788883986' },
      { text: 'Mon-Fri, 08:00-18:00 CAT', icon: 'clock', href: '#' }
    ]
  }
]

const iconMap = {
  in: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM4 8.98h2v12H4zM9.5 9h1.9v1.6h.03c.26-.5.9-1.1 1.86-1.1 1.99 0 2.36 1.3 2.36 3v5.48h-2V13.9c0-1.1-.02-2.52-1.54-2.52-1.54 0-1.78 1.2-1.78 2.44v7.16h-2z" />
    </svg>
  ),
  tw: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M21 5.2a6 6 0 01-1.7.5 3 3 0 001.3-1.7 6 6 0 01-1.9.8A3 3 0 0012 7.5a8.5 8.5 0 01-6.2-3.1 3 3 0 00.9 4 3 3 0 01-1.4-.4v.1a3 3 0 002.4 3 3 3 0 01-1.4.1 3 3 0 002.8 2A6 6 0 013 16.3 8.5 8.5 0 007.6 18c5.7 0 8.8-4.7 8.8-8.8v-.4A6 6 0 0021 5.2z" />
    </svg>
  ),
  gh: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1-1-1.3-1-1.3-.8-.6.1-.6.1-.6.9.1 1.3.9 1.3.9.8 1.3 2 1 2.5.8.1-.6.3-1 .6-1.3-2.2-.2-4.5-1.1-4.5-5a4 4 0 011-2.8 3.7 3.7 0 01.1-2.8s.8-.3 2.8 1a9.6 9.6 0 015 0c2-1.3 2.8-1 2.8-1a3.7 3.7 0 01.1 2.8 4 4 0 011 2.8c0 3.9-2.3 4.8-4.6 5 .3.2.6.7.6 1.5v2.2c0 .3.2.6.7.5A10 10 0 0012 2z" />
    </svg>
  ),
  yt: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M21.5 7.2s-.2-1.5-.8-2.2c-.8-.8-1.7-.8-2.1-.8C15.4 4 12 4 12 4h0s-3.4 0-6.6.2c-.4 0-1.3 0-2.1.8-.6.7-.8 2.2-.8 2.2S2 8.8 2 10.4v1.2c0 1.6.2 3.2.2 3.2s.2 1.5.8 2.2c.8.8 1.8.8 2.2.9 1.6.1 6.6.2 6.6.2s3.4 0 6.6-.2c.4 0 1.3 0 2.1-.8.6-.7.8-2.2.8-2.2s.2-1.6.2-3.2v-1.2c0-1.6-.2-3.2-.2-3.2zM10 13.8V8.9l4.8 2.5z" />
    </svg>
  ),
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

const focusedLinkClass = 'cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b2d23] focus-visible:outline-none'

export default function PublicFooter() {
  return (
    <footer className="mt-8 w-full">
      <div className="w-full border-t border-white/10 bg-gradient-to-br from-[#0b2d23] via-[#114536] to-[#0a3c34] px-4 py-10 text-white shadow-[0_30px_70px_-40px_rgba(10,27,38,0.75)] sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-[1400px] gap-8 lg:grid-cols-[1.2fr_3fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/14 text-base font-semibold tracking-[0.08em]">
                <span className="absolute left-1 top-1 h-2 w-2 rounded-sm bg-[#1f8f5f]" />
                GS
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight">GeoSmart Manager</p>
                <p className="text-sm text-white/70">Building digital land systems for Africa.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {social.map((item) => (
                <a
                  key={item.label}
                  className={`flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/50 transition-colors duration-200 hover:text-white/80 ${focusedLinkClass}`}
                  href={item.href}
                  aria-label={item.label}
                  target="_blank"
                  rel="noreferrer"
                >
                  {iconMap[item.icon]}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title} className="space-y-3">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30">{col.title}</p>
                <ul className="text-[12px] text-white/50">
                  {col.links.map((item) => {
                    const content = (
                      <span className="flex items-center gap-2">
                        {item.icon && iconMap[item.icon]}
                        <span>{item.text}</span>
                      </span>
                    )

                    if (item.to) {
                      return (
                        <li key={item.text}>
                          <Link className={`mb-2 block transition-colors hover:text-white/80 ${focusedLinkClass}`} to={item.to}>
                            {content}
                          </Link>
                        </li>
                      )
                    }

                    return (
                      <li key={item.text}>
                        <a
                          className={`mb-2 block transition-colors hover:text-white/80 ${focusedLinkClass}`}
                          href={item.href}
                          target={item.href?.startsWith('http') ? '_blank' : undefined}
                          rel="noreferrer"
                        >
                          {content}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/[0.06] pt-4 text-[11px] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>(c) {new Date().getFullYear()} GeoSmart. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <a className={`transition-colors hover:text-white/50 ${focusedLinkClass}`} href="#">Privacy</a>
            <span aria-hidden="true">&middot;</span>
            <a className={`transition-colors hover:text-white/50 ${focusedLinkClass}`} href="#">Terms</a>
            <span aria-hidden="true">&middot;</span>
            <a className={`transition-colors hover:text-white/50 ${focusedLinkClass}`} href="#">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
