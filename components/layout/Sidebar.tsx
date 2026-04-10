'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '⬡', label: 'Dashboard', section: 'main' },
  { href: '/chat', icon: '💬', label: 'Regulatory Chat', section: 'main' },
  { href: '/upload', icon: '📂', label: 'Upload & Review', section: 'main' },
  { href: '/audit', icon: '📋', label: 'Audit Log', section: 'main' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏥</div>
        <div>
          <div className="sidebar-logo-text">MedReg AI</div>
          <div className="sidebar-logo-sub">Regulatory Assistant</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            id={`nav-${item.href.slice(1)}`}
            className={`nav-link${pathname.startsWith(item.href) ? ' active' : ''}`}
          >
            <span className="nav-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Reference</div>
        <div className="nav-link" style={{ cursor: 'default', opacity: 0.5 }}>
          <span className="nav-link-icon">📖</span>
          Regulations Library
        </div>
        <div className="nav-link" style={{ cursor: 'default', opacity: 0.5 }}>
          <span className="nav-link-icon">⚙️</span>
          Settings
        </div>
      </nav>

      {/* Footer: user */}
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">SK</div>
          <div>
            <div className="user-name">Dr. Sarah Kim</div>
            <div className="user-role">Regulatory Affairs</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
