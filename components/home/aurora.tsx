"use client"

import { useEffect, useRef } from "react"
import { Mesh, Program, Renderer, Triangle } from "ogl"

// Aurora (ispirata a React Bits): bande di colore che ondeggiano, disegnate con un piccolo shader WebGL.

const vertex = /* glsl */ `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uAmplitude;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

// Rumore simplex 2D (Ashima Arts, licenza MIT)
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  // Rampa di colore da sinistra a destra
  vec3 ramp = uv.x < 0.5 ? mix(uColor1, uColor2, uv.x * 2.0) : mix(uColor2, uColor3, (uv.x - 0.5) * 2.0);
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  float alpha = smoothstep(-0.3, 0.7, intensity);
  gl_FragColor = vec4(intensity * ramp * alpha, alpha);
}
`

const hex = (color: string) => {
  const n = Number.parseInt(color.replace("#", ""), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// Fuori dal componente: un array nuovo a ogni render farebbe ripartire WebGL
const PALETTE: [string, string, string] = ["#AA3E98", "#9368B7", "#75DDDD"]

export function Aurora({
  colors = PALETTE,
  amplitude = 1,
  speed = 0.5,
}: {
  colors?: [string, string, string]
  amplitude?: number
  speed?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const coarse = window.matchMedia("(pointer: coarse)").matches
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let renderer: Renderer
    try {
      // Risoluzione bassa: è uno sfondo sfumato, i dettagli non servono
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: false, dpr: coarse ? 0.5 : 0.75 })
    } catch {
      return // WebGL non disponibile: niente aurora, la pagina funziona lo stesso
    }
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.canvas.style.width = "100%"
    gl.canvas.style.height = "100%"
    container.appendChild(gl.canvas)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uResolution: { value: [1, 1] },
        uColor1: { value: hex(colors[0]) },
        uColor2: { value: hex(colors[1]) },
        uColor3: { value: hex(colors[2]) },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const resize = () => {
      renderer.setSize(container.offsetWidth, container.offsetHeight)
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height]
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    // Disegna solo quando è visibile e la scheda del browser è in primo piano
    let visible = true
    const intersection = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    intersection.observe(container)

    let frame = 0
    const draw = (time: number) => {
      program.uniforms.uTime.value = time * 0.001 * speed
      renderer.render({ scene: mesh })
    }
    const loop = (time: number) => {
      frame = requestAnimationFrame(loop)
      if (visible && document.visibilityState === "visible") draw(time)
    }
    if (reduced) draw(4000)
    else frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersection.disconnect()
      gl.canvas.remove()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [colors, amplitude, speed])

  return <div ref={ref} className="h-full w-full" aria-hidden />
}
