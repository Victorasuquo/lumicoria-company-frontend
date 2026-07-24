import { useEffect, useState } from 'react'
import { ArrowUpRight, List, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { contactHref, navItems } from '../data/site'

export function Nav() {
  const [isOpen, setIsOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const isHome = window.location.pathname === '/'

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <motion.header
      className="site-nav-wrap"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand" href={isHome ? '#top' : '/'} aria-label="Lumicoria.com home">
          <img src="/brand-mark.png" alt="" />
          <span>Lumicoria</span>
        </a>

        <div className="nav-links">
          {navItems.map((item) => (
            <a key={item.href} href={isHome ? item.href : `/${item.href}`}>
              {item.label}
            </a>
          ))}
          <a href="/portal/login">Client portal</a>
        </div>

        <a className="nav-cta" href={contactHref}>
          Talk to our team
          <ArrowUpRight aria-hidden="true" weight="bold" />
        </a>

        <button
          className="nav-menu-button"
          type="button"
          aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="mobile-menu"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mobile-menu-links">
              {navItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={isHome ? item.href : `/${item.href}`}
                  onClick={() => setIsOpen(false)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                >
                  {item.label}
                </motion.a>
              ))}
              <motion.a
                href="/portal/login"
                onClick={() => setIsOpen(false)}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: navItems.length * 0.05, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                Client portal
              </motion.a>
            </div>
            <a className="button button-primary button-block" href={contactHref}>
              Talk to our team
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
