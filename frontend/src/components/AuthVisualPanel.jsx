import React from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { publicImages } from '../assets/publicImages'

export default function AuthVisualPanel({
  imageSrc,
  imageAlt,
  eyebrow,
  title,
  description,
  detailTitle,
  detailText,
  className = '',
  imageClassName = ''
}) {
  return (
    <section className={`animate-rise relative isolate overflow-hidden border border-[#0D6B50]/15 bg-[#16362f] shadow-[0_28px_70px_-52px_rgba(15,23,42,0.85)] min-h-[320px] sm:min-h-[380px] lg:min-h-screen ${className}`.trim()}>
      <img
        src={imageSrc}
        alt={imageAlt}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className={`absolute inset-0 h-full w-full object-cover object-center ${imageClassName}`.trim()}
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,25,21,0.82)_0%,rgba(7,25,21,0.48)_38%,rgba(7,25,21,0.12)_72%,rgba(7,25,21,0.36)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#091d18]/92 via-[#091d18]/28 to-transparent" />

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-7 lg:p-10">
        <div className="flex items-start justify-between gap-4">
          <BrandLogo
            to="/"
            src={publicImages.newBlackLogoTransparent}
            className="w-[164px] sm:w-[212px] lg:w-[248px]"
          />
          <Link className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:text-white" to="/">
            Home
          </Link>
        </div>

        <div className="max-w-[34rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/78">{eyebrow}</p>
          <h1 className="mt-4 max-w-[32rem] text-3xl font-semibold leading-[1.02] text-white sm:text-4xl lg:text-[3.55rem]">{title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/82 sm:text-base">{description}</p>
          {(detailTitle || detailText) && (
            <div className="mt-6 max-w-md border border-white/18 bg-[#0b241f]/34 px-4 py-4 backdrop-blur-md sm:px-5">
              {detailTitle && <p className="text-sm font-semibold text-white">{detailTitle}</p>}
              {detailText && <p className="mt-2 text-xs leading-6 text-white/76">{detailText}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
