import { useEffect, useRef } from 'react'

const vertex = `attribute vec2 position; varying vec2 uv;
void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }`
const fragment = `precision mediump float;
varying vec2 uv; uniform float time; uniform float activity; uniform vec2 resolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float n=0., a=.5;for(int i=0;i<3;i++){n+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return n;}
void main(){
vec2 p=(uv-.5)*2.; p.x*=resolution.x/resolution.y;
float r=length(p), angle=atan(p.y,p.x);
float ripple=sin(angle*3.+time*.75)*.56+sin(angle*5.-time*1.1)*.28+sin(angle*7.+time*1.4)*.16;
float radius=.72+activity*.10+(.005+activity*.035)*ripple;
float edge=1.-smoothstep(radius-.006,radius+.009,r);
float z=sqrt(max(0.,1.-pow(r/radius,2.)));
vec2 q=p*1.3+vec2(time*.065,-time*.045);
float flow=fbm(q+vec2(fbm(q+time*.04),fbm(q-2.7)));
float ribbon=sin(p.y*3.2+p.x*1.8+flow*3.8-time*.36+activity*.6);
vec3 violet=vec3(.42,.31,1.), blue=vec3(.16,.40,.93), pearl=vec3(.94,.93,1.);
vec3 color=mix(violet,blue,smoothstep(-.8,.8,p.x+flow));
color=mix(color,pearl,smoothstep(-.55,.75,ribbon)*.78);
color*=.78+.22*z;
float rim=pow(1.-z,3.);
float highlight=pow(max(0.,dot(normalize(vec3(p,z)),normalize(vec3(-.45,.65,1.)))),35.);
color=mix(color,pearl,rim*.7)+highlight*.42;
float ring=exp(-abs(r-radius)*150.);
float alpha=edge*(.66+.18*rim)+ring*.14;
gl_FragColor=vec4(color,clamp(alpha,0.,.95));
}`

export function RebeccaFluid({ level, active }: { level: number; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef({ level, active })
  input.current = { level, active }
  useEffect(() => {
    const surface = canvas.current
    const gl = surface?.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
    if (!surface || !gl) return
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null }
      return shader
    }
    const vertexShader = compile(gl.VERTEX_SHADER, vertex)
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment)
    if (!vertexShader || !fragmentShader) return
    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    gl.useProgram(program)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const timeLocation = gl.getUniformLocation(program, 'time')
    const activityLocation = gl.getUniformLocation(program, 'activity')
    const resolutionLocation = gl.getUniformLocation(program, 'resolution')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let previous = 0
    let visible = true
    let smoothed = 0
    let lost = false
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting })
    observer.observe(surface)
    const onLost = (event: Event) => { event.preventDefault(); lost = true; surface.classList.add('is-unavailable') }
    surface.addEventListener('webglcontextlost', onLost)
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      if (lost || !visible || document.hidden || now - previous < 33) return
      previous = now
      const size = Math.round(Math.min(surface.clientWidth, 560) * Math.min(window.devicePixelRatio || 1, 1.5))
      if (!size) return
      if (surface.width !== size) { surface.width = size; surface.height = size; gl.viewport(0, 0, size, size) }
      const target = input.current.active ? Math.max(0, Math.min(1, input.current.level)) : 0
      smoothed += (target - smoothed) * (target > smoothed ? .48 : .15)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 5 : now / 1000)
      gl.uniform1f(activityLocation, reducedMotion.matches ? 0 : smoothed)
      gl.uniform2f(resolutionLocation, size, size)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      surface.classList.add('is-rendered')
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      surface.removeEventListener('webglcontextlost', onLost)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [])
  return <div className="rebecca-fluid" aria-hidden="true"><div className="rebecca-fluid-fallback" style={{ transform: `scale(${1 + (active ? Math.min(1, Math.max(0, level)) : 0) * .2})` }} /><canvas ref={canvas} /></div>
}
