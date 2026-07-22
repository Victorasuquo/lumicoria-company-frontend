import type { PropsWithChildren } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type RevealProps = PropsWithChildren<{
  className?: string
  delay?: number
  amount?: number
  id?: string
}>

export function Reveal({ children, className, delay = 0, amount = 0.2, id }: RevealProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      id={id}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 28, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
