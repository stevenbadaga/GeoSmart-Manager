import React from 'react'
import { Link } from 'react-router-dom'
import { publicImages } from '../assets/publicImages'
import { useTheme } from '../theme/ThemeContext'

const panelClasses = {
  none: '',
  light: 'rounded-[1.2rem] border border-clay/70 bg-white px-3 py-2 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)]',
  dark: 'rounded-[1.2rem] bg-white/96 px-3 py-2 shadow-[0_20px_40px_-28px_rgba(5,16,13,0.7)]'
}

export default function BrandLogo({
  to,
  src = publicImages.newWhiteLogoTransparent,
  darkSrc,
  alt = 'GeoSmart Manager logo',
  panel = 'none',
  className = '',
  imageClassName = '',
  linkClassName = ''
}) {
  const { isDark } = useTheme()
  const resolvedDarkSrc = darkSrc || (src === publicImages.newWhiteLogoTransparent ? publicImages.newBlackLogoTransparent : src)
  const resolvedSrc = isDark ? resolvedDarkSrc : src

  const content = (
    <span className={`inline-flex shrink-0 ${panelClasses[panel] || panelClasses.none} ${className}`.trim()}>
      <img
        src={resolvedSrc}
        alt={alt}
        className={`brand-logo-image block h-auto w-full max-w-full bg-transparent object-contain ${imageClassName}`.trim()}
      />
    </span>
  )

  if (!to) {
    return content
  }

  return (
    <Link
      to={to}
      className={`inline-flex items-center cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none ${linkClassName}`.trim()}
    >
      {content}
    </Link>
  )
}
