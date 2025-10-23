"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    }),
    [],
  )

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // Hexagonal pattern function
    float hexPattern(vec2 p) {
      vec2 h = vec2(1.0, 1.732);
      vec2 a = mod(p, h) - h * 0.5;
      vec2 b = mod(p - h * 0.5, h) - h * 0.5;
      return min(length(a), length(b));
    }

    // Noise function
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Smooth noise
    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 p = uv * 8.0;
      
      // Animated hexagonal pattern
      float hex = hexPattern(p + vec2(uTime * 0.1, uTime * 0.05));
      hex = smoothstep(0.4, 0.5, hex);
      
      // Flowing light effect
      float flow1 = smoothNoise(p * 0.5 + vec2(uTime * 0.3, uTime * 0.2));
      float flow2 = smoothNoise(p * 0.3 - vec2(uTime * 0.2, uTime * 0.15));
      float flow = (flow1 + flow2) * 0.5;
      
      // Diagonal light streaks
      float streak1 = sin((uv.x - uv.y) * 10.0 + uTime * 2.0) * 0.5 + 0.5;
      float streak2 = sin((uv.x + uv.y) * 8.0 - uTime * 1.5) * 0.5 + 0.5;
      streak1 = pow(streak1, 8.0);
      streak2 = pow(streak2, 10.0);
      
      // Combine effects
      float light = (streak1 + streak2) * 0.3 + flow * 0.2;
      
      // Geometric shapes with glow
      float shape1 = smoothstep(0.6, 0.4, length(uv - vec2(0.3, 0.7) + vec2(sin(uTime * 0.5) * 0.1, cos(uTime * 0.3) * 0.1)));
      float shape2 = smoothstep(0.5, 0.3, length(uv - vec2(0.7, 0.3) + vec2(cos(uTime * 0.4) * 0.1, sin(uTime * 0.6) * 0.1)));
      
      // Teal/cyan color palette
      vec3 color1 = vec3(0.0, 0.8, 0.9); // Bright teal
      vec3 color2 = vec3(0.0, 0.4, 0.6); // Dark teal
      vec3 baseColor = vec3(0.02, 0.02, 0.05); // Very dark blue-black
      
      // Mix colors based on effects
      vec3 finalColor = baseColor;
      finalColor += color1 * light * 0.4;
      finalColor += color2 * hex * 0.1;
      finalColor += color1 * (shape1 + shape2) * 0.3;
      
      // Add subtle glow in cracks
      float crack = 1.0 - hex;
      finalColor += color1 * crack * light * 0.5;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  )
}

export default function ShaderBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }} style={{ width: "100%", height: "100%" }}>
        <ShaderPlane />
      </Canvas>
    </div>
  )
}
