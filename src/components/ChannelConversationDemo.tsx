import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { CaretLeft, Checks, CursorClick, GlobeHemisphereWest, PaperPlaneTilt, Pause, Play } from '@phosphor-icons/react'
import './channel-conversation-demo.css'

const conversations = [
  { name: 'Instagram', image: 'instagram.webp', customer: 'nia.studio', attachment: '/products/leather-shoulder-bag.webp', attachmentAlt: 'Chestnut leather shoulder bag', question: 'This bag! Is it still available?', answer: 'Yes, the brown one is available. Would you like the details?', followUp: 'Yes please! Do you deliver to Abuja?', closing: 'We do. Send your area and I’ll help with the next step.' },
  { name: 'WhatsApp', image: 'whatsapp.svg', customer: 'Nia Studio', attachment: '/products/ivory-headphones.webp', attachmentAlt: 'Ivory wireless headphones', question: 'Hi, do you have these in cream?', answer: 'Hi! Yes, that’s our ivory colour. Is this the pair you’d like?', followUp: 'Yes. Can someone help me order?', closing: 'Of course. I’ll get the team to help you finish your order.' },
  { name: 'Facebook', image: 'facebook.png', customer: 'Nia Studio', attachment: '/products/leather-shoulder-bag.webp', attachmentAlt: 'Brown leather bag from a shared post', question: 'Saw this on your page. Can I get more photos?', answer: 'Absolutely. You’re looking at the brown shoulder bag?', followUp: 'That’s the one. I love the colour.', closing: 'Good choice. I’ll ask the team to share a closer look.' },
  { name: 'Email', image: 'gmail.svg', customer: 'Nia Studio', attachment: '/products/ivory-headphones.webp', attachmentAlt: 'Cream over-ear headphones', question: 'Hello! Can I ask about these headphones?', answer: 'Of course. What would you like to know?', followUp: 'Do you have a collection point?', closing: 'I’ll have the team send you the current collection options.' },
  { name: 'X', image: 'x.ico', customer: '@nia_studio', attachment: '/products/leather-shoulder-bag.webp', attachmentAlt: 'Leather shoulder bag shared in a message', question: 'Found this on your feed. Where can I order?', answer: 'You can enquire right here. Which colour caught your eye?', followUp: 'The brown one in the photo.', closing: 'Got it. I’ll connect you with the team to confirm your order.' },
  { name: 'TikTok', image: 'tiktok.png', customer: 'nia.studio', attachment: '/products/ivory-headphones.webp', attachmentAlt: 'Ivory headphones from a product video', question: 'These from your video! Do you still have them?', answer: 'Yes! Are you interested in the ivory pair?', followUp: 'Exactly. Can I get the details?', closing: 'Sure. I’ll get the team to send everything you need.' },
  { name: 'Web chat', image: '', customer: 'Nia Studio', attachment: '/products/leather-shoulder-bag.webp', attachmentAlt: 'Chestnut shoulder bag in an enquiry', question: 'Can you help me choose a bag?', answer: 'Happy to. Is this for everyday use or a special occasion?', followUp: 'Everyday. Something simple like this.', closing: 'That helps. I’ll pass your preference to the team.' },
]

export function ChannelConversationDemo() {
  const container = useRef<HTMLDivElement>(null)
  const messageList = useRef<HTMLDivElement>(null)
  const inView = useInView(container, { amount: 0.2 })
  const reducedMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [visiblePage, setVisiblePage] = useState(true)
  const [sequence, setSequence] = useState({ channel: 0, step: 0 })
  const conversation = conversations[sequence.channel]
  const step = reducedMotion ? 6 : sequence.step

  useEffect(() => {
    const messages = messageList.current
    if (messages && inView) messages.scrollTo({ top: messages.scrollHeight, behavior: reducedMotion ? 'instant' : 'smooth' })
  }, [step, sequence.channel, reducedMotion, inView])

  useEffect(() => {
    const updateVisibility = () => setVisiblePage(document.visibilityState === 'visible')
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  useEffect(() => {
    if (!inView || paused || reducedMotion || !visiblePage) return
    const timer = window.setTimeout(() => {
      setSequence(current => current.step >= 6
        ? { channel: (current.channel + 1) % conversations.length, step: 0 }
        : { ...current, step: current.step + 1 })
    }, sequence.step === 6 ? 3200 : sequence.step === 0 ? 1700 : sequence.step === 3 ? 2200 : 1200)
    return () => window.clearTimeout(timer)
  }, [inView, paused, reducedMotion, visiblePage, sequence])

  return (
    <div className="channel-demo" ref={container} role="region" aria-label="Scripted product conversation preview. Nia Studio is a fictional shop.">
      <div className="channel-demo-window">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={conversation.name} className="channel-demo-scene" initial={reducedMotion ? false : { opacity: 0, x: 45, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -45, filter: 'blur(4px)' }} transition={{ duration: reducedMotion ? 0 : 0.35 }}>
            <div className="channel-demo-contact">
              <CaretLeft size={20} aria-hidden="true" />
              <img className="channel-demo-shop-avatar" src="/products/leather-shoulder-bag.webp" alt="" />
              <strong>{conversation.customer}</strong>
              <span className="channel-demo-platform">{conversation.image ? <img src={`/channel-icons/${conversation.image}`} alt={conversation.name} /> : <GlobeHemisphereWest size={22} aria-label="Web chat" />}</span>
            </div>
            <div className="channel-demo-messages" ref={messageList} aria-live="off" tabIndex={0} aria-label={`${conversation.name} example conversation`}>
              <div className="channel-demo-message channel-demo-message--customer channel-demo-message--photo">
                <div className="channel-demo-attachment">
                  <img src={conversation.attachment} alt={conversation.attachmentAlt} loading="lazy" />
                  {step === 2 && <motion.div className="channel-demo-pointer" initial={reducedMotion ? false : { opacity: 0, x: 18, y: 18 }} animate={{ opacity: 1, x: 0, y: 0 }}><CursorClick size={24} weight="fill" /></motion.div>}
                </div>
                <p>{conversation.question}</p>
              </div>
              {step === 2 && <div className="channel-demo-typing" aria-label="Typing"><b /><b /><b /></div>}
              {step >= 3 && <motion.div className="channel-demo-message channel-demo-message--agent" initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}><p>{conversation.answer}</p><small><Checks size={13} /></small></motion.div>}
              {step >= 4 && <motion.div className="channel-demo-message channel-demo-message--customer" initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><p>{conversation.followUp}</p></motion.div>}
              {step === 5 && <div className="channel-demo-typing" aria-label="Typing"><b /><b /><b /></div>}
              {step >= 6 && <motion.div className="channel-demo-message channel-demo-message--agent" initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}><p>{conversation.closing}</p><small><Checks size={13} /></small></motion.div>}
            </div>
            <div className="channel-demo-composer" aria-hidden="true"><span>Message…</span><PaperPlaneTilt size={19} /></div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="channel-demo-controls" aria-label="Choose a channel demonstration">
        {conversations.map((channel, index) => <button key={channel.name} type="button" aria-label={`Show ${channel.name} conversation`} aria-pressed={sequence.channel === index} onClick={() => setSequence({ channel: index, step: paused ? 6 : 0 })} title={channel.name}>{channel.image ? <img src={`/channel-icons/${channel.image}`} alt="" /> : <GlobeHemisphereWest size={21} />}</button>)}
        {!reducedMotion && <button type="button" className="channel-demo-pause" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play conversation demo' : 'Pause conversation demo'} aria-pressed={paused}>{paused ? <Play size={13} weight="fill" /> : <Pause size={13} weight="fill" />}</button>}
      </div>
    </div>
  )
}
