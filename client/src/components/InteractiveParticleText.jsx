import { useEffect, useRef } from 'react'

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const normalized = value.length === 3
    ? value
        .split('')
        .map((char) => char + char)
        .join('')
    : value

  const number = Number.parseInt(normalized, 16)
  const red = (number >> 16) & 255
  const green = (number >> 8) & 255
  const blue = number & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export default function InteractiveParticleText({
  text = 'SyncTube',
  className = '',
}) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const pointerRef = useRef({ x: 0, y: 0, active: false })
  const particlesRef = useRef([])
  const animationRef = useRef(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    const pointerState = pointerRef.current

    const rebuildParticles = () => {
      const rect = wrapper.getBoundingClientRect()
      const width = Math.max(rect.width, 120)
      const height = Math.max(rect.height, 80)
      const devicePixelRatio = window.devicePixelRatio || 1

      canvas.width = width * devicePixelRatio
      canvas.height = height * devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

      const offscreen = document.createElement('canvas')
      offscreen.width = width * devicePixelRatio
      offscreen.height = height * devicePixelRatio
      const offscreenContext = offscreen.getContext('2d')
      if (!offscreenContext) return

      offscreenContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      offscreenContext.clearRect(0, 0, width, height)
      offscreenContext.textAlign = 'left'
      offscreenContext.textBaseline = 'middle'

      const fontSize = Math.max(Math.min(width * 0.17, 84), 28)
      offscreenContext.font = `900 ${fontSize}px Segoe UI, Inter, Arial, sans-serif`

      const syncText = 'Sync'
      const tubeText = 'Tube'
      const syncWidth = offscreenContext.measureText(syncText).width
      const tubeWidth = offscreenContext.measureText(tubeText).width
      const totalWidth = syncWidth + tubeWidth + 10
      const startX = Math.max((width - totalWidth) / 2, 14)
      const tubeStartX = startX + syncWidth + 10
      const centerY = height / 2 - 2

      offscreenContext.fillStyle = '#0f0f0f'
      offscreenContext.fillText(syncText, startX, centerY)
      offscreenContext.fillStyle = '#ff2e4c'
      offscreenContext.fillText(tubeText, tubeStartX, centerY)

      const imageData = offscreenContext.getImageData(0, 0, width, height).data
      const particles = []
      const step = width < 420 ? 3 : 4

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4
          const alpha = imageData[index + 3]
          if (alpha < 30) continue

          const red = imageData[index]
          const green = imageData[index + 1]
          const blue = imageData[index + 2]
          const isRed = red > 180 && green < 120 && blue < 120
          const isBlack = red < 90 && green < 90 && blue < 90
          const isAccent = (x + y) % 9 === 0 || (x + y) % 13 === 0

          if (!isRed && !isBlack) continue

          particles.push({
            x: x + (Math.random() - 0.5) * 0.35,
            y: y + (Math.random() - 0.5) * 0.35,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
            seed: Math.random() * Math.PI * 2,
            accent: isAccent,
            color: isRed ? '#ff2e4c' : '#0f0f0f',
          })
        }
      }

      particlesRef.current = particles
    }

    const draw = (timestamp) => {
      const width = canvas.width / (window.devicePixelRatio || 1)
      const height = canvas.height / (window.devicePixelRatio || 1)
      context.clearRect(0, 0, width, height)

      if (pointerState.active && isFinePointer) {
        const glow = context.createRadialGradient(
          pointerState.x,
          pointerState.y,
          0,
          pointerState.x,
          pointerState.y,
          110
        )
        glow.addColorStop(0, 'rgba(255, 46, 76, 0.28)')
        glow.addColorStop(0.25, 'rgba(255, 46, 76, 0.12)')
        glow.addColorStop(1, 'rgba(255, 46, 76, 0)')
        context.fillStyle = glow
        context.beginPath()
        context.arc(pointerState.x, pointerState.y, 110, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = 'rgba(255, 46, 76, 0.9)'
        context.beginPath()
        context.arc(pointerState.x, pointerState.y, 3.3, 0, Math.PI * 2)
        context.fill()
      }

      const particles = particlesRef.current

      for (const particle of particles) {
        let dx = 0
        let dy = 0

        if (isFinePointer && pointerState.active) {
          dx = pointerState.x - particle.x
          dy = pointerState.y - particle.y
          const distance = Math.hypot(dx, dy) || 1

          if (distance < 90) {
            const force = (1 - distance / 90) * 1.8
            particle.vx -= (dx / distance) * force * 1.8
            particle.vy -= (dy / distance) * force * 1.8
          }
        }

        if (!isFinePointer || !pointerState.active) {
          const driftX = Math.sin((timestamp * 0.0013) + particle.seed) * 1.2
          const driftY = Math.cos((timestamp * 0.0011) + particle.seed) * 1.1
          particle.vx += (particle.baseX + driftX - particle.x) * 0.02
          particle.vy += (particle.baseY + driftY - particle.y) * 0.02
        }

        particle.vx += (particle.baseX - particle.x) * 0.08
        particle.vy += (particle.baseY - particle.y) * 0.08

        particle.x += particle.vx
        particle.y += particle.vy
        particle.vx *= 0.72
        particle.vy *= 0.72

        const alpha = particle.accent ? 0.95 : 0.8
        const color = particle.color
        context.fillStyle = hexToRgba(color, alpha)
        context.beginPath()
        context.arc(particle.x, particle.y, particle.accent ? 1.9 : 1.4, 0, Math.PI * 2)
        context.fill()
      }

      animationRef.current = window.requestAnimationFrame(draw)
    }

    const handlePointerMove = (event) => {
      const rect = wrapper.getBoundingClientRect()
      pointerState.x = event.clientX - rect.left
      pointerState.y = event.clientY - rect.top
      pointerState.active = true
    }

    const handlePointerLeave = () => {
      pointerState.active = false
    }

    const handleResize = () => {
      rebuildParticles()
    }

    rebuildParticles()
    animationRef.current = window.requestAnimationFrame(draw)

    if (isFinePointer) {
      wrapper.addEventListener('pointermove', handlePointerMove)
      wrapper.addEventListener('pointerleave', handlePointerLeave)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current)
      }

      if (isFinePointer) {
        wrapper.removeEventListener('pointermove', handlePointerMove)
        wrapper.removeEventListener('pointerleave', handlePointerLeave)
      }

      window.removeEventListener('resize', handleResize)
    }
  }, [text])

  return (
    <div
      ref={wrapperRef}
      className={`relative block select-none ${className}`}
      aria-label={text}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-hidden="true"
      />
      <span className="sr-only">{text}</span>
    </div>
  )
}
