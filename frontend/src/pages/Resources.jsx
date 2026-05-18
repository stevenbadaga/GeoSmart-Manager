import React from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import Card from '../components/Card'

const resources = [
  {
    id: 'product-guide',
    title: 'Product Guide',
    text: 'Quick start for admins, surveyors, and reviewers. Covers projects, datasets, AI runs, and exports.',
    cta: { label: 'Open guide', href: 'https://example.com/geosmart-product-guide' }
  },
  {
    id: 'security',
    title: 'Security Brief',
    text: 'Role-based access, audit trails, data residency notes, and incident response overview.',
    cta: { label: 'Download brief', href: 'https://example.com/geosmart-security-brief' }
  },
  {
    id: 'release-notes',
    title: 'Release Notes',
    text: 'Monthly updates, fixes, and AI tuning highlights.',
    cta: { label: 'View notes', href: 'https://example.com/geosmart-release-notes' }
  },
  {
    id: 'support',
    title: 'Support Center',
    text: 'Contact, SLAs, and how to escalate production issues.',
    cta: { label: 'Contact support', href: '/contact', internal: true }
  }
]

export default function Resources() {
  return (
    <PublicLayout>
      <div className="space-y-8 py-16">
        <header className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Resources</p>
          <h1 className="text-4xl text-ink leading-tight">Documentation that ships with the product.</h1>
          <p className="text-sm text-gray-500 max-w-md">Stay aligned on controls, updates, and operating procedures.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((item) => (
            <Card key={item.id} className="bg-white border-l-4 border-l-river" title={item.title} id={item.id}>
              <p className="text-sm text-gray-500">{item.text}</p>
              <div className="mt-4">
                {item.internal ? (
                  <Link className="text-sm font-semibold text-green-800 underline-offset-4 hover:underline" to={item.cta.href}>
                    {item.cta.label}
                  </Link>
                ) : (
                  <a
                    className="text-sm font-semibold text-green-800 underline-offset-4 hover:underline"
                    href={item.cta.href}
                    target={item.cta.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                  >
                    {item.cta.label}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
