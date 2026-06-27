import React, { useState } from 'react'
import PublicLayout from '../components/PublicLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import { api } from '../api/http'

export default function Contact() {
  const [form, setForm] = useState({ fullName: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/contact/messages', form)
      setSent(true)
      setForm({ fullName: '', email: '', subject: '', message: '' })
    } catch (err) {
      setError('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <div className="space-y-16">
        <section className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/70">Get in touch</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-ink sm:text-6xl">Talk to the GeoSmart team</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg">
            Whether you have questions about subdivision workflows, GIS data integration, or partnership opportunities, we're here to help.
          </p>
        </section>

        <section className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-clay/70 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-black text-ink">Direct contact</h2>
              <div className="mt-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#124E44]/5 text-[#124E44]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/40">Email Us</p>
                    <a href="mailto:badagaclass@gmail.com" className="mt-0.5 block font-semibold text-[#124E44] hover:underline">
                      badagaclass@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#124E44]/5 text-[#124E44]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.81 12.81 0 00.63 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.63A2 2 0 0122 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/40">Call Us</p>
                    <a href="tel:+250788883986" className="mt-0.5 block font-semibold text-[#124E44] hover:underline">
                      +250788883986
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#124E44]/5 text-[#124E44]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/40">Our Location</p>
                    <p className="mt-0.5 font-semibold text-ink/80">Kigali, Rwanda</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#124E44]/10 bg-[#124E44]/5 p-8">
              <p className="text-sm leading-7 text-ink/65">
                Our support team is available Monday through Friday, 08:00 - 18:00 CAT. We aim to respond to all inquiries within 24 hours.
              </p>
            </div>
          </div>

          <form
            className="rounded-[2rem] border border-clay/70 bg-white p-8 shadow-xl shadow-clay/20"
            onSubmit={handleSubmit}
          >
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-ink">Send a message</h2>
                <p className="mt-2 text-sm text-ink/60">Fill out the form below and we'll get back to you shortly.</p>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <Input 
                  label="Full name" 
                  autoComplete="name" 
                  required 
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                />
                <Input 
                  label="Email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              
              <Input 
                label="Subject" 
                required 
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
              />
              
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Message</span>
                <textarea 
                  className="input min-h-40 w-full resize-none rounded-2xl border-clay/60 bg-sand/20 p-4 focus:border-[#124E44] focus:ring-1 focus:ring-[#124E44]" 
                  placeholder="How can we help you?"
                  required 
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                />
              </label>

              {error && (
                <p className="text-sm text-danger font-medium">{error}</p>
              )}

              {sent && (
                <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Your message has been sent successfully.</span>
                </div>
              )}

              <Button className="w-full py-4 text-base" disabled={loading}>
                {loading ? 'Sending...' : 'Submit Inquiry'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </PublicLayout>
  )
}
