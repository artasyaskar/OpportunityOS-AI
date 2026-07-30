'use client';

import React, { useRef, useEffect, useState, Component, ReactNode } from 'react';
import * as THREE from 'three';

// WebGL availability inspector
function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// 2D Elegant Fallback Background for systems with WebGL disabled or driver issues
function FallbackBackground() {
  return (
    <div className="three-fallback-bg">
      <div className="three-fallback-glow" />
    </div>
  );
}

// Error Boundary specifically around 3D WebGL rendering
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class ThreeSceneErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('[ThreeSceneErrorBoundary] Caught 3D WebGL initialization error:', error);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackBackground />;
    }
    return this.props.children;
  }
}

function ThreeSceneInner() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLError, setWebGLError] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    if (!isWebGLAvailable()) {
      console.warn('[ThreeScene] WebGL unavailable on browser/GPU. Rendering 2D CSS background fallback.');
      setWebGLError(true);
      return;
    }

    mountRef.current.innerHTML = '';

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 9.5);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
    } catch (e) {
      console.warn('[ThreeScene] Failed to create WebGLRenderer context:', e);
      setWebGLError(true);
      return;
    }

    if (!renderer || !renderer.domElement) {
      setWebGLError(true);
      return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountRef.current.appendChild(renderer.domElement);

    // WebGL Context Lost safety handler
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('[ThreeScene] WebGL context lost at runtime. Switching to 2D CSS fallback.');
      setWebGLError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    // ========================
    // OPPORTUNITY CORE ORB
    // ========================
    const coreGeometry = new THREE.IcosahedronGeometry(1.8, 2);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x6366f1,
      emissive: 0x3730a3,
      emissiveIntensity: 0.4,
      wireframe: false,
      transparent: true,
      opacity: 0.85,
      shininess: 100,
      flatShading: true,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    // Wireframe overlay
    const wireGeo = new THREE.IcosahedronGeometry(1.85, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireframe = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wireframe);

    // Orbit Ring 1
    const ring1Geo = new THREE.TorusGeometry(2.8, 0.02, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.45 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    scene.add(ring1);

    const sat1Geo = new THREE.SphereGeometry(0.12, 16, 16);
    const sat1Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const sat1 = new THREE.Mesh(sat1Geo, sat1Mat);
    scene.add(sat1);

    // Orbit Ring 2
    const ring2Geo = new THREE.TorusGeometry(3.4, 0.015, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.25 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = -Math.PI / 4;
    scene.add(ring2);

    const sat2Geo = new THREE.SphereGeometry(0.09, 16, 16);
    const sat2Mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const sat2 = new THREE.Mesh(sat2Geo, sat2Mat);
    scene.add(sat2);

    // Particles System
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0x6366f1),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0x10b981),
      new THREE.Color(0x3b82f6),
    ];

    for (let i = 0; i < particleCount; i++) {
      const radius = 3.5 + Math.random() * 6.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      pColors[i * 3] = color.r;
      pColors[i * 3 + 1] = color.g;
      pColors[i * 3 + 2] = color.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1e1b4b, 2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 8, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x06b6d4, 6, 20);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x8b5cf6, 4, 15);
    pointLight3.position.set(0, 5, -5);
    scene.add(pointLight3);

    // Interactive mouse movement
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let frameId: number;
    let clock = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      clock += 0.01;

      core.rotation.x += 0.003;
      core.rotation.y += 0.005;
      wireframe.rotation.x += 0.003;
      wireframe.rotation.y += 0.005;

      ring1.rotation.z += 0.002;
      ring2.rotation.z -= 0.0015;
      particles.rotation.y += 0.0005;

      // Satellite 1 orbit
      const r1 = 2.8;
      sat1.position.x = Math.cos(clock * 0.8) * r1;
      sat1.position.z = Math.sin(clock * 0.8) * r1;
      sat1.position.y = Math.sin(clock * 0.8) * 0.8;

      // Satellite 2 orbit
      const r2 = 3.4;
      sat2.position.x = Math.cos(-clock * 0.6 + 1) * r2;
      sat2.position.y = Math.sin(-clock * 0.6 + 1) * r2;
      sat2.position.z = Math.cos(-clock * 0.6 + 1) * 0.5;

      // Camera subtle mouse follow
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 0.3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      if (renderer) {
        renderer.render(scene, camera);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!renderer) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, []);

  if (webGLError) {
    return <FallbackBackground />;
  }

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: 'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #020408 60%)',
        overflow: 'hidden',
        pointerEvents: 'none',
        display: 'block',
        margin: 0,
        padding: 0,
      }}
    />
  );
}

export default function ThreeScene() {
  return (
    <ThreeSceneErrorBoundary>
      <ThreeSceneInner />
    </ThreeSceneErrorBoundary>
  );
}
