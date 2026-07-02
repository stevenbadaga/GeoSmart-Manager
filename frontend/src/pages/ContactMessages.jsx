import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'

export default function ContactMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const loadMessages = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/admin/contact-messages')
      setMessages(data)
    } catch (err) {
      console.error('Failed to load messages', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const updateStatus = async (id, status) => {
    try {
      if (status === 'READ') {
        await api.patch(`/api/admin/contact-messages/${id}/read`)
      } else if (status === 'REPLIED') {
        await api.patch(`/api/admin/contact-messages/${id}/replied`)
      } else if (status === 'ARCHIVED') {
        await api.patch(`/api/admin/contact-messages/${id}/archive`)
      }
      setMessages(messages.map(m => m.id === id ? { ...m, status } : m))
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  const getStatusStyles = (status) => {
    switch (status) {
      case 'NEW': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'READ': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'REPLIED': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'ARCHIVED': return 'bg-slate-100 text-slate-500 border-slate-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">Public Relations</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Contact Messages</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">Review and manage inquiries from the public contact form.</p>
      </section>

      <div className="grid gap-6">
        {loading ? (
          <p className="p-12 text-center text-ink/40 font-medium">Loading messages...</p>
        ) : messages.length === 0 ? (
          <Card className="p-16 text-center">
             <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-50 text-slate-300 border border-slate-100">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="mt-6 text-xl font-bold text-ink tracking-tight">No inquiries found</h3>
            <p className="mt-2 text-ink/50 max-w-sm mx-auto">When people submit the public contact form, their messages will appear here for you to manage.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <Card key={m.id} className={`transition hover:shadow-lg ${m.status === 'ARCHIVED' ? 'opacity-60' : ''}`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusStyles(m.status)}`}>
                        {m.status}
                      </span>
                      <h4 className="text-lg font-black text-ink">{m.subject}</h4>
                    </div>
                    
                    <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">From</p>
                        <p className="font-bold text-ink/80">{m.fullName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">Email</p>
                        <a href={`mailto:${m.email}`} className="font-bold text-emerald-700 hover:underline">{m.email}</a>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                      <p className="text-sm leading-relaxed text-ink/75 italic">"{m.message}"</p>
                    </div>

                    <p className="text-[11px] font-medium text-ink/40">Received on {new Date(m.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                    {m.status === 'NEW' && (
                      <Button variant="secondary" className="text-xs" onClick={() => updateStatus(m.id, 'READ')}>Mark Read</Button>
                    )}
                    {m.status !== 'REPLIED' && m.status !== 'ARCHIVED' && (
                      <Button variant="secondary" className="text-xs" onClick={() => updateStatus(m.id, 'REPLIED')}>Mark Replied</Button>
                    )}
                    {m.status !== 'ARCHIVED' && (
                      <Button variant="secondary" className="text-xs border-danger/30 text-danger hover:bg-danger/5" onClick={() => updateStatus(m.id, 'ARCHIVED')}>Archive</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
