import { useEffect, useRef, useState } from 'react'
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl'
import { cn } from '@/lib/utils'

/**
 * Particles — a WebGL field of soft drifting points (ogl, gl.POINTS): each
 * particle sways on its own sine phase inside a sphere while the whole cloud
 * slowly tumbles. Colors are CSS expressions (var()/color-mix welcome)
 * resolved to RGB at runtime, so the field stays on-token in light and dark
 * mode; the color buffer is re-sampled when the theme root's attributes flip.
 *
 * `prefers-reduced-motion: reduce` renders nothing — the page keeps its
 * static decoration instead. The rAF loop parks itself while the tab is
 * hidden or the canvas is scrolled out of view. The layer never intercepts
 * pointer events: hover parallax reads a window-level pointermove instead.
 */

const VERT = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = projectionMatrix * mvPos;
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));

    if (uAlphaParticles < 0.5) {
      if (d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`

type Rgb = [number, number, number]

const FALLBACK_RGB: Rgb = [0.5, 0.5, 0.5]

/**
 * Resolve arbitrary CSS color expressions (var(), color-mix, oklch…) to
 * 0..1 RGB triples for the shader. A probe element gives us the computed
 * color under the current theme; a 1×1 2d canvas converts whatever syntax
 * the browser hands back into plain bytes.
 */
function resolvePalette(colors: string[]): Rgb[] {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const out = colors.map<Rgb>((color) => {
    if (!ctx) return FALLBACK_RGB
    probe.style.color = ''
    probe.style.color = color
    const computed = getComputedStyle(probe).color
    if (!computed) return FALLBACK_RGB
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = computed
    ctx.fillRect(0, 0, 1, 1)
    const data = ctx.getImageData(0, 0, 1, 1).data
    return [(data[0] ?? 0) / 255, (data[1] ?? 0) / 255, (data[2] ?? 0) / 255]
  })
  probe.remove()
  return out
}

interface ParticlesProps {
  particleCount?: number
  /** Radius multiplier of the spawn sphere (z is stretched 10×). */
  particleSpread?: number
  /** Time multiplier for sway + rotation. */
  speed?: number
  /** CSS color expressions; each particle picks one at random. */
  particleColors?: string[]
  /** Parallax the cloud against the pointer (window-level, never blocks clicks). */
  moveParticlesOnHover?: boolean
  particleHoverFactor?: number
  /** Soft alpha-fading dots instead of hard-edged discs. */
  alphaParticles?: boolean
  particleBaseSize?: number
  /** 0 = uniform size, 1 = full random spread. */
  sizeRandomness?: number
  cameraDistance?: number
  disableRotation?: boolean
  className?: string
}

export function Particles({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors = ['var(--color-accent)', 'var(--color-fg-subtle)'],
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = true,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  className,
}: ParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Per-frame knobs update live through a ref — no GL teardown per render.
  const knobsRef = useRef({ speed, moveParticlesOnHover, particleHoverFactor, disableRotation, particleColors })
  knobsRef.current = { speed, moveParticlesOnHover, particleHoverFactor, disableRotation, particleColors }

  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Palette identity by value: inline array literals shouldn't rebuild the scene.
  const colorsKey = particleColors.join('|')

  useEffect(() => {
    const ctn = containerRef.current
    if (!ctn || reducedMotion) return

    // Context creation fails on headless/ancient GPUs — degrade to nothing.
    let renderer: Renderer
    let camera: Camera
    let geometry: Geometry
    let program: Program
    let particles: Mesh
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const count = particleCount
    const colors = new Float32Array(count * 3)
    // Which palette slot each particle drew — kept so a theme flip can
    // re-tint the buffer without reshuffling the field.
    const paletteIndices = new Uint16Array(count)
    try {
      renderer = new Renderer({ dpr, depth: false, alpha: true })
      const gl = renderer.gl
      gl.clearColor(0, 0, 0, 0)

      camera = new Camera(gl, { fov: 15 })
      camera.position.set(0, 0, cameraDistance)

      const positions = new Float32Array(count * 3)
      const randoms = new Float32Array(count * 4)
      const palette = resolvePalette(knobsRef.current.particleColors)

      for (let i = 0; i < count; i++) {
        // Rejection-sample a unit sphere, then bias radius for uniform density.
        let x: number, y: number, z: number, len: number
        do {
          x = Math.random() * 2 - 1
          y = Math.random() * 2 - 1
          z = Math.random() * 2 - 1
          len = x * x + y * y + z * z
        } while (len > 1 || len === 0)
        const r = Math.cbrt(Math.random())
        positions.set([x * r, y * r, z * r], i * 3)
        randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
        const slot = Math.floor(Math.random() * palette.length)
        paletteIndices[i] = slot
        colors.set(palette[slot] ?? FALLBACK_RGB, i * 3)
      }

      geometry = new Geometry(gl, {
        position: { size: 3, data: positions },
        random: { size: 4, data: randoms },
        color: { size: 3, data: colors },
      })

      program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uSpread: { value: particleSpread },
          uBaseSize: { value: particleBaseSize * dpr },
          uSizeRandomness: { value: sizeRandomness },
          uAlphaParticles: { value: alphaParticles ? 1 : 0 },
        },
        transparent: true,
        depthTest: false,
      })

      particles = new Mesh(gl, { mode: gl.POINTS, geometry, program })
    } catch {
      return
    }
    const gl = renderer.gl
    ctn.appendChild(gl.canvas)

    const resize = () => {
      const width = ctn.offsetWidth
      const height = ctn.offsetHeight
      if (width === 0 || height === 0) return
      renderer.setSize(width, height)
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(ctn)
    resize()

    // Hover parallax listens on window so the layer stays pointer-events-none
    // and never blocks clicks; coords are clamped once the pointer leaves.
    const mouse = { x: 0, y: 0 }
    const onPointerMove = (e: PointerEvent) => {
      if (!knobsRef.current.moveParticlesOnHover) return
      const rect = ctn.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mouse.x = Math.max(-1, Math.min(1, x))
      mouse.y = Math.max(-1, Math.min(1, y))
    }
    window.addEventListener('pointermove', onPointerMove)

    // Theme flips (class / data-theme / data-accent on <html>) change what
    // the tokens resolve to — re-tint the color buffer in place.
    const applyPalette = () => {
      const palette = resolvePalette(knobsRef.current.particleColors)
      for (let i = 0; i < count; i++) {
        colors.set(palette[paletteIndices[i] % palette.length] ?? FALLBACK_RGB, i * 3)
      }
      const attr = geometry.attributes.color
      if (attr) attr.needsUpdate = true
    }
    const themeObserver = new MutationObserver(applyPalette)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-accent', 'style'],
    })

    // Accumulate speed-scaled time across pauses so resuming doesn't jump.
    let elapsed = 0
    let prev: number | null = null
    let raf = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const knobs = knobsRef.current
      if (prev !== null) elapsed += (t - prev) * knobs.speed
      prev = t

      program.uniforms.uTime.value = elapsed * 0.001

      if (knobs.moveParticlesOnHover) {
        particles.position.x = -mouse.x * knobs.particleHoverFactor
        particles.position.y = -mouse.y * knobs.particleHoverFactor
      } else {
        particles.position.x = 0
        particles.position.y = 0
      }

      if (!knobs.disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15
        particles.rotation.z += 0.01 * knobs.speed
      }

      renderer.render({ scene: particles, camera })
    }

    // Marketing-page hygiene: park the loop when the tab is hidden or the
    // canvas leaves the viewport.
    let inView = true
    const start = () => {
      if (raf) return
      prev = null
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const sync = () => {
      if (inView && !document.hidden) start()
      else stop()
    }
    const onVisibility = () => sync()
    document.addEventListener('visibilitychange', onVisibility)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true
      sync()
    })
    intersectionObserver.observe(ctn)
    sync()

    return () => {
      stop()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [
    reducedMotion,
    particleCount,
    particleSpread,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    colorsKey,
  ])

  if (reducedMotion) return null

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    />
  )
}
