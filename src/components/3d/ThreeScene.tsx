'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Prevent duplicate canvas mounts (especially during React HMR/Hot Reloads)
    mountRef.current.innerHTML = '';

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Calibrated camera distance for perfect 100% zoom scaling and full centering
    camera.position.set(0, 0, 9.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    // Style the canvas to ensure it behaves block-level and fills the viewport perfectly
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountRef.current.appendChild(renderer.domElement);

    // ========================
    // OPPORTUNITY CORE ORB
    // ========================
    // Icosahedron with detail = 2 creates beautiful visible facet faces when flatShading is enabled
    const coreGeometry = new THREE.IcosahedronGeometry(1.8, 2);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x6366f1,
      emissive: 0x3730a3,
      emissiveIntensity: 0.4,
      wireframe: false,
      transparent: true,
      opacity: 0.85,
      shininess: 100,
      flatShading: true, // Enables highly premium crystal-like light faceting
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    // Wireframe overlay
    const wireGeo = new THREE.IcosahedronGeometry(1.85, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const wireframe = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wireframe);

    // Outer glow ring 1
    const ring1Geo = new THREE.TorusGeometry(2.8, 0.02, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.45 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 4;
    scene.add(ring1);

    // Orbiting Satellite 1 on Ring 1
    const sat1Geo = new THREE.SphereGeometry(0.12, 16, 16);
    const sat1Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const sat1 = new THREE.Mesh(sat1Geo, sat1Mat);
    scene.add(sat1);

    // Outer glow ring 2
    const ring2Geo = new THREE.TorusGeometry(3.4, 0.015, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.25 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 6;
    ring2.rotation.y = Math.PI / 3;
    scene.add(ring2);

    // Orbiting Satellite 2 on Ring 2
    const sat2Geo = new THREE.SphereGeometry(0.09, 16, 16);
    const sat2Mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const sat2 = new THREE.Mesh(sat2Geo, sat2Mat);
    scene.add(sat2);

    // ========================
    // PARTICLE FIELD
    // ========================
    const particleCount = 350;
    const positions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const colorPalette = [
      new THREE.Color(0x6366f1),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0x10b981),
      new THREE.Color(0x3b82f6),
    ];

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 6;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      pColors[i * 3] = c.r;
      pColors[i * 3 + 1] = c.g;
      pColors[i * 3 + 2] = c.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ========================
    // LIGHTING
    // ========================
    const ambientLight = new THREE.AmbientLight(0x1e1b4b, 2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 8, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x06b6d4, 6, 20);
    pointLight2.position.set(-5, -3, 3);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x8b5cf6, 4, 15);
    pointLight3.position.set(0, 8, -5);
    scene.add(pointLight3);

    // ========================
    // MOUSE INTERACTION
    // ========================
    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ========================
    // ANIMATION LOOP
    // ========================
    let frameId: number;
    const clock = new THREE.Timer(); 

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      clock.update();
      const t = clock.getElapsed();

      // Continuous, smooth rotation along Y-axis for the main globe (with minor mouse track)
      core.rotation.y = t * 0.15 + mouseX * 0.2;
      core.rotation.x = mouseY * 0.2; // secondary response to mouse
      
      wireframe.rotation.y = t * 0.12;
      wireframe.rotation.x = mouseY * 0.1;

      // Animate the two rings forward and outward on intersecting axes
      // Ring 1 rotates on X and Y axes
      ring1.rotation.x = t * 0.12;
      ring1.rotation.y = t * 0.18;

      // Ring 2 rotates on Y and Z axes
      ring2.rotation.y = -t * 0.15;
      ring2.rotation.z = t * 0.2;

      // Move Orbiting Satellite 1 along Ring 1 path (XY plane rotated by Math.PI / 4 on X)
      const angle1 = t * 0.45;
      sat1.position.x = 2.8 * Math.cos(angle1);
      sat1.position.y = 2.8 * Math.sin(angle1);
      sat1.position.z = 0;
      sat1.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 4);

      // Move Orbiting Satellite 2 along Ring 2 path (XY plane rotated by -Math.PI / 6 on X, Math.PI / 3 on Y)
      const angle2 = -t * 0.35;
      sat2.position.x = 3.4 * Math.cos(angle2);
      sat2.position.y = 3.4 * Math.sin(angle2);
      sat2.position.z = 0;
      sat2.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 6);
      sat2.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3);

      particles.rotation.y = t * 0.04;
      particles.rotation.x = t * 0.015;

      // Slowly animate the primary lighting positions to create dynamic shifting highlights on facets
      pointLight1.position.x = 6 * Math.cos(t * 0.25);
      pointLight1.position.z = 6 * Math.sin(t * 0.25);
      pointLight2.position.y = 5 * Math.sin(t * 0.35);

      // Pulsing glow
      const pulse = Math.sin(t * 2) * 0.5 + 0.5;
      coreMaterial.emissiveIntensity = 0.3 + pulse * 0.35;

      // Camera drift
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 0.3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ========================
    // RESIZE HANDLER
    // ========================
    const handleResize = () => {
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
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1, // Sits strictly behind all foreground components
        background: 'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #020408 60%)',
        overflow: 'hidden',
        pointerEvents: 'none', // Ensure it never blocks mouse clicks or hovers
        display: 'block',
        margin: 0,
        padding: 0
      }}
    />
  );
}
