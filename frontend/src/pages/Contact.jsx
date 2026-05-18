import React, { useState } from 'react'
import PublicLayout from '../components/PublicLayout'
import Input from '../components/Input'
import Card from '../components/Card'
import Button from '../components/Button'

export default function Contact() {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!formState.name || !formState.email || !formState.message) {
      setStatus('Please add a name, email, and short message.')
      return
    }
    setStatus('Thanks - message captured. We will follow up soon.')
  }

  return (
    <PublicLayout>
      <section className="grid gap-8 py-16 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Contact</p>
          <h1 className="text-4xl leading-tight text-ink">Let's talk about your subdivision work.</h1>
          <p className="max-w-md text-sm text-gray-500">
            Drop a quick note and we'll schedule a walkthrough of the AI subdivision and compliance tools.
          </p>

          <Card className="border border-gray-100 bg-white">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-ink">Email:</span>{' '}
              <a className="text-[#0D6B50] underline underline-offset-4 hover:text-[#0A5742]" href="mailto:hello@geosmart.rw">
                hello@geosmart.rw
              </a>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-semibold text-ink">Phone:</span>{' '}
              <a className="text-[#0D6B50] underline underline-offset-4 hover:text-[#0A5742]" href="tel:0788883986">
                0788883986
              </a>
            </p>
            <p className="mt-2 text-sm text-ink/60">We usually reply within one business day.</p>
          </Card>
        </div>

        <Card className="border border-gray-100 bg-white" title="Send a message">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="Name" value={formState.name} onChange={handleChange('name')} placeholder="Jane Doe" />
            <Input label="Email" type="email" value={formState.email} onChange={handleChange('email')} placeholder="jane@example.com" />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Message</span>
              <textarea
                className="input min-h-[140px]"
                value={formState.message}
                onChange={handleChange('message')}
                placeholder="Share context, timelines, or datasets you work with."
              />
            </label>
            {status && (
              <div className="rounded-lg border border-clay/60 bg-sand/80 px-3 py-2 text-sm text-ink/75">
                {status}
              </div>
            )}
            <Button type="submit" className="w-full">Send</Button>
          </form>
        </Card>
      </section>
    </PublicLayout>
  )
}
