import React, { useState } from 'react'
import PublicLayout from '../components/PublicLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import PublicImagePlaceholder from '../components/PublicImagePlaceholder'

export default function Contact() {
  const [sent, setSent] = useState(false)

  return (
    <PublicLayout>
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/70">Contact</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-ink">Talk to the GeoSmart team</h1>
            <p className="mt-4 text-sm leading-7 text-ink/65">Use this prototype contact form for questions, demonstrations, or academic review feedback.</p>
          </div>
          <div className="rounded-[2rem] border border-clay/70 bg-white p-6 text-sm leading-7 text-ink/65">
            <p>Email: contact@example.com</p>
            <p>Phone: +250 000 000 000</p>
            <p>Location: Kigali, Rwanda</p>
          </div>
          <PublicImagePlaceholder label="Contact illustration placeholder" />
        </div>
        <form
          className="rounded-[2rem] border border-clay/70 bg-white p-6 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.75)]"
          onSubmit={(event) => {
            event.preventDefault()
            setSent(true)
          }}
        >
          <div className="space-y-4">
            <Input label="Full name" required />
            <Input label="Email" type="email" required />
            <Input label="Subject" required />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Message</span>
              <textarea className="input min-h-40" required />
            </label>
            {sent && <p className="rounded-2xl border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">Message captured for demo purposes. Backend delivery can be connected later.</p>}
            <Button className="w-full">Submit message</Button>
          </div>
        </form>
      </div>
    </PublicLayout>
  )
}
