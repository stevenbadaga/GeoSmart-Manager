import React from 'react'

export default function PublicShowcaseImage({
  src,
  alt,
  eyebrow,
  title,
  note,
  className = '',
  imageClassName = ''
}) {
  return (
    <div className={`relative isolate overflow-hidden border border-[#124E44]/15 bg-[#16362f] shadow-[0_28px_70px_-52px_rgba(15,23,42,0.85)] ${className}`}>
      <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover object-center ${imageClassName}`.trim()} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b241f]/32 via-transparent to-transparent" />
      {eyebrow && (
        <div className="absolute left-4 top-4 border border-white/20 bg-white/92 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#124E44] shadow-[0_18px_30px_-24px_rgba(15,23,42,0.6)] sm:left-5 sm:top-5">
          {eyebrow}
        </div>
      )}
      {(eyebrow || title || note) && (
        <div className="absolute inset-x-4 bottom-4 max-w-md border border-white/18 bg-[#0b241f]/66 p-4 text-white backdrop-blur-sm sm:inset-x-5 sm:bottom-5 sm:p-5">
          {title && <h2 className="max-w-xl text-2xl font-semibold leading-tight text-white sm:text-[1.8rem]">{title}</h2>}
          {note && <p className={`${title ? 'mt-2' : ''} max-w-xl text-sm leading-6 text-white/82`}>{note}</p>}
        </div>
      )}
    </div>
  )
}
