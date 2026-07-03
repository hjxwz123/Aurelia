import { useEffect, useRef, useState } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { cn } from '@/lib/utils'

/**
 * Aurora — a WebGL curtain of light that drifts along the top of the hero:
 * simplex-noise displaces a soft color ramp built from theme tokens, so the
 * glow stays clay→sage in light and dark mode alike. Stops are CSS
 * expressions (var()/color-mix welcome) resolved to RGB at runtime and
 * re-resolved when the theme root's attributes change.
 *
 * `prefers-reduced-motion: reduce` renders nothing — the page keeps its
 * static orbs instead. The rAF loop also parks itself while the tab is
 * hidden or the canvas is scrolled out of view.
 */

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uIntensity;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * uIntensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
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
function resolveColorStops(stops: string[]): Rgb[] {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const out = stops.map<Rgb>((stop) => {
    if (!ctx) return FALLBACK_RGB
    probe.style.color = ''
    probe.style.color = stop
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

interface AuroraProps {
  /** CSS color expressions for the left/mid/right ramp stops. */
  colorStops?: string[]
  /** Noise displacement of the curtain's lower edge. */
  amplitude?: number
  /** Softness of the alpha falloff at the curtain edge. */
  blend?: number
  /** Time multiplier for the drift. */
  speed?: number
  /** Brightness multiplier on the ramp color. */
  intensity?: number
  className?: string
}

export function Aurora({
  colorStops = ['var(--color-accent)', 'var(--color-secondary)', 'var(--color-accent)'],
  amplitude = 1.0,
  blend = 0.5,
  speed = 0.6,
  intensity = 1.0,
  className,
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Uniform-only knobs update live through a ref — no GL teardown per render.
  const knobsRef = useRef({ amplitude, blend, speed, intensity, colorStops })
  knobsRef.current = { amplitude, blend, speed, intensity, colorStops }

  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Stop identity by value: inline array literals shouldn't rebuild the scene.
  const stopsKey = colorStops.join('|')

  useEffect(() => {
    const ctn = containerRef.current
    if (!ctn || reducedMotion) return

    // Context creation fails on headless/ancient GPUs — degrade to nothing.
    let renderer: Renderer
    let program: Program
    let mesh: Mesh
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true })
      const gl = renderer.gl
      gl.clearColor(0, 0, 0, 0)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.canvas.style.backgroundColor = 'transparent'

      const geometry = new Triangle(gl)
      // Triangle ships a uv attribute the shader never reads.
      if (geometry.attributes.uv) delete geometry.attributes.uv

      program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: knobsRef.current.amplitude },
          uColorStops: { value: resolveColorStops(knobsRef.current.colorStops) },
          uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
          uBlend: { value: knobsRef.current.blend },
          uIntensity: { value: knobsRef.current.intensity },
        },
      })
      mesh = new Mesh(gl, { geometry, program })
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
      program.uniforms.uResolution.value = [width, height]
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(ctn)
    resize()

    // Theme flips (class / data-theme on <html>) change what the tokens
    // resolve to — re-sample the ramp when that happens.
    const applyStops = () => {
      program.uniforms.uColorStops.value = resolveColorStops(knobsRef.current.colorStops)
    }
    const themeObserver = new MutationObserver(applyStops)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      // data-accent: the welcome wizard re-tints the accent LIVE while this is
      // on screen — the ramp must follow the pick, not the mount-time color.
      attributeFilter: ['class', 'data-theme', 'data-accent', 'style'],
    })

    // Accumulate elapsed time across pauses so resuming doesn't jump.
    let elapsed = 0
    let prev: number | null = null
    let raf = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      if (prev !== null) elapsed += t - prev
      prev = t
      const knobs = knobsRef.current
      program.uniforms.uTime.value = elapsed * 0.001 * knobs.speed
      program.uniforms.uAmplitude.value = knobs.amplitude
      program.uniforms.uBlend.value = knobs.blend
      program.uniforms.uIntensity.value = knobs.intensity
      renderer.render({ scene: mesh })
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
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [reducedMotion, stopsKey])

  if (reducedMotion) return null

  return <div ref={containerRef} className={cn('absolute inset-0 overflow-hidden', className)} aria-hidden />
}
