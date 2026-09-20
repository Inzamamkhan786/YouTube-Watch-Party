import { useEffect, useRef } from 'react'

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const normalized =
    value.length === 3
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
  const pointerRef = useRef({ x: -1000, y: -1000, active: false })
  const particlesRef = useRef([])
  const animationRef = useRef(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const pointerState = pointerRef.current

    const rebuildParticles = () => {
      const rect = wrapper.getBoundingClientRect()
      // Responsive width and height matching container
      const width = Math.floor(rect.width) || 280
      const height = Math.floor(rect.height) || 64
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)

      // Physical canvas dimensions (retina/HiDPI ready)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Logical offscreen canvas for sampling exact pixel coordinates
      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const offscreenContext = offscreen.getContext('2d')
      if (!offscreenContext) return

      offscreenContext.clearRect(0, 0, width, height)
      offscreenContext.textAlign = 'left'
      offscreenContext.textBaseline = 'middle'

      // Exact Segoe UI font stack matching the brand wordmark
      const fontStack = 'Segoe UI, Inter, Arial, sans-serif'

      // Dynamically calculate font size to comfortably fill the container
      // while preventing text clipping on mobile screens
      const testSize = 60
      offscreenContext.font = `900 ${testSize}px ${fontStack}`
      const testSyncW = offscreenContext.measureText('Sync').width
      const testTubeW = offscreenContext.measureText('Tube').width
      const testGap = 12
      const testTotalW = testSyncW + testTubeW + testGap
      const testCapH = testSize * 0.76

      // Scale to fit available width and height with safe padding
      const scaleW = (width * 0.92) / testTotalW
      const scaleH = (height * 0.82) / testCapH
      const scale = Math.min(scaleW, scaleH)
      const fontSize = Math.max(Math.min(Math.floor(testSize * scale), 68), 32)

      offscreenContext.font = `900 ${fontSize}px ${fontStack}`
      const syncWidth = offscreenContext.measureText('Sync').width
      const tubeWidth = offscreenContext.measureText('Tube').width
      const gap = Math.max(Math.round(fontSize * 0.18), 8)
      const totalWidth = syncWidth + tubeWidth + gap

      // Center text horizontally and vertically
      const startX = Math.max(Math.round((width - totalWidth) / 2), 4)
      const tubeStartX = startX + syncWidth + gap
      const centerY = Math.round(height / 2) - 1

      // Render "Sync" in pure pitch black and "Tube" in saturated YouTube red
      offscreenContext.fillStyle = '#000000'
      offscreenContext.fillText('Sync', startX, centerY)
      offscreenContext.fillStyle = '#ff0033'
      offscreenContext.fillText('Tube', tubeStartX, centerY)

      // Sample pixels
      const imageData = offscreenContext.getImageData(0, 0, width, height).data
      const particles = []

      // Ultra-dense particle sampling across all screen sizes
      const step = fontSize < 44 ? 1.8 : 2.2
      const baseRadius = fontSize < 44 ? 1.55 : Math.max(1.6, fontSize * 0.032)
      const accentRadius = baseRadius * 1.25

      for (let y = 0; y < height; y += step) {
        const py = Math.floor(y)
        for (let x = 0; x < width; x += step) {
          const px = Math.floor(x)
          const index = (py * width + px) * 4
          const alpha = imageData[index + 3]
          if (alpha < 18) continue

          const red = imageData[index]
          const green = imageData[index + 1]
          const blue = imageData[index + 2]

          const isRed = red > 150 && green < 130 && blue < 130
          const isBlack = red < 120 && green < 120 && blue < 120

          if (!isRed && !isBlack) continue

          const isAccent = (px + py) % 8 === 0 || (px + py) % 12 === 0
          const colorHex = isRed ? '#ff0033' : '#000000'
          // Pure 100% solid opacity for maximum darkness and contrast
          const particleColor = hexToRgba(colorHex, 1.0)

          particles.push({
            x: px + (Math.random() - 0.5) * 0.25,
            y: py + (Math.random() - 0.5) * 0.25,
            baseX: px,
            baseY: py,
            vx: 0,
            vy: 0,
            radius: isAccent ? accentRadius : baseRadius,
            seed: Math.random() * Math.PI * 2,
            color: particleColor,
          })
        }
      }

      particlesRef.current = particles
    }

    const draw = (timestamp) => {
      const rect = wrapper.getBoundingClientRect()
      const width = Math.floor(rect.width) || 280
      const height = Math.floor(rect.height) || 64

      context.clearRect(0, 0, width, height)

      // Pointer glow effect
      if (pointerState.active) {
        const glowRadius = Math.max(50, Math.min(width * 0.24, 100))
        const glow = context.createRadialGradient(
          pointerState.x,
          pointerState.y,
          0,
          pointerState.x,
          pointerState.y,
          glowRadius
        )
        glow.addColorStop(0, 'rgba(255, 46, 76, 0.26)')
        glow.addColorStop(0.3, 'rgba(255, 46, 76, 0.1)')
        glow.addColorStop(1, 'rgba(255, 46, 76, 0)')

        context.fillStyle = glow
        context.beginPath()
        context.arc(pointerState.x, pointerState.y, glowRadius, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = 'rgba(255, 46, 76, 0.9)'
        context.beginPath()
        context.arc(pointerState.x, pointerState.y, 3.2, 0, Math.PI * 2)
        context.fill()
      }

      const particles = particlesRef.current
      const interactDist = Math.max(55, Math.min(width * 0.24, 95))

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i]

        // Pointer repulsion (mouse or touch)
        if (pointerState.active) {
          const dx = pointerState.x - particle.x
          const dy = pointerState.y - particle.y
          const distance = Math.hypot(dx, dy) || 1

          if (distance < interactDist) {
            const force = (1 - distance / interactDist) * 1.9
            particle.vx -= (dx / distance) * force * 1.9
            particle.vy -= (dy / distance) * force * 1.9
          }
        }

        // Subtle ambient organic drift
        const driftX = Math.sin(timestamp * 0.0013 + particle.seed) * 0.5
        const driftY = Math.cos(timestamp * 0.0011 + particle.seed) * 0.4
        particle.vx += (particle.baseX + driftX - particle.x) * 0.02
        particle.vy += (particle.baseY + driftY - particle.y) * 0.02

        // Snap back spring force
        particle.vx += (particle.baseX - particle.x) * 0.08
        particle.vy += (particle.baseY - particle.y) * 0.08

        // Physics integration
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vx *= 0.73
        particle.vy *= 0.73

        // Draw particle dot
        context.fillStyle = particle.color
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fill()
      }

      animationRef.current = window.requestAnimationFrame(draw)
    }

    const updatePointer = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect()
      pointerState.x = clientX - rect.left
      pointerState.y = clientY - rect.top
      pointerState.active = true
    }

    const handlePointerMove = (e) => updatePointer(e.clientX, e.clientY)
    const handlePointerDown = (e) => updatePointer(e.clientX, e.clientY)
    const handlePointerUp = () => {
      pointerState.active = false
    }
    const handlePointerLeave = () => {
      pointerState.active = false
    }

    rebuildParticles()
    animationRef.current = window.requestAnimationFrame(draw)

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => rebuildParticles())
        .catch(() => {})
    }

    let lastW = 0
    let lastH = 0
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (w > 0 && h > 0 && (w !== lastW || h !== lastH)) {
          lastW = w
          lastH = h
          rebuildParticles()
        }
      }
    })
    resizeObserver.observe(wrapper)

    wrapper.addEventListener('pointermove', handlePointerMove, { passive: true })
    wrapper.addEventListener('pointerdown', handlePointerDown, { passive: true })
    wrapper.addEventListener('pointerup', handlePointerUp, { passive: true })
    wrapper.addEventListener('pointercancel', handlePointerUp, { passive: true })
    wrapper.addEventListener('pointerleave', handlePointerLeave, { passive: true })

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current)
      }
      resizeObserver.disconnect()
      wrapper.removeEventListener('pointermove', handlePointerMove)
      wrapper.removeEventListener('pointerdown', handlePointerDown)
      wrapper.removeEventListener('pointerup', handlePointerUp)
      wrapper.removeEventListener('pointercancel', handlePointerUp)
      wrapper.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [text])

  return (
    <div
      ref={wrapperRef}
      className={`relative block select-none touch-pan-y ${className}`}
      aria-label={text}
      style={{ touchAction: 'pan-y' }}
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
