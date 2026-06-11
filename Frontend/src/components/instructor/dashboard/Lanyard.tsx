import * as THREE from 'three'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture, Environment, Lightformer } from '@react-three/drei'
import { BallCollider, CuboidCollider, Physics, RigidBody, RapierRigidBody, useRopeJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { extend } from '@react-three/fiber'

// Import assets
import cardTexture from '@/assets/lanyard/card_texture.png'
import lanyardTexture from '@/assets/lanyard/lanyard.png'

extend({ MeshLineGeometry, MeshLineMaterial })

export default function Lanyard({ position = [0, 8, 0], gravity = [0, -40, 0] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[50]" style={{ background: 'transparent' }}>
      <Canvas 
        gl={{ alpha: true, antialias: true, clearColor: 0x000000, clearAlpha: 0 }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
        camera={{ position: [0, 0, 10], fov: 25 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1.5} />
        <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={100} castShadow />
        <Physics gravity={gravity as [number, number, number]} interpolate={false}>
          <Band position={position as [number, number, number]} />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
          <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[10, 2, 1]} />
          <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 2, 1]} />
        </Environment>
      </Canvas>
    </div>
  )
}

function Band({ position: initialPos = [0, 5, 0] }) {
  const cardRef = useRef<RapierRigidBody>(null)
  const fixedRef = useRef<RapierRigidBody>(null)
  const [dragged, setDragged] = useState<THREE.Vector3 | null>(null)
  const lineGeomRef = useRef<MeshLineGeometry>(null)
  
  const cardTex = useTexture(cardTexture)
  const strapTex = useTexture(lanyardTexture)
  strapTex.wrapS = strapTex.wrapT = THREE.RepeatWrapping
  strapTex.repeat.set(1, 10)

  // Use a simple line between fixed point and card for the strap
  const lineRef = useRef<THREE.Group>(null)
  const [curve] = useState(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, -2, 0),
    new THREE.Vector3(0, -3, 0)
  ]))

  const vec = new THREE.Vector3()

  useFrame((state) => {
    if (dragged) {
      // Calculate mouse position in 3D
      vec.set(state.pointer.x * 5, state.pointer.y * 5, 0)
      fixedRef.current?.setNextKinematicTranslation(vec)
    }

    if (fixedRef.current && cardRef.current && lineRef.current) {
        const p1 = fixedRef.current.translation()
        const p2 = cardRef.current.translation()
        
        // Update the visual "rope"
        // This is a simplified version; for a real physics rope we'd use multiple segments
        curve.points[0].set(p1.x, p1.y, p1.z)
        curve.points[3].set(p2.x, p2.y, p2.z)
        
        // Intermediate points for a slight "bend" effect
        curve.points[1].set(p1.x, (p1.y + p2.y) / 2 + 0.5, (p1.z + p2.z) / 2)
        curve.points[2].set(p2.x, (p1.y + p2.y) / 2 - 0.5, (p1.z + p2.z) / 2)

        if (lineGeomRef.current) {
            lineGeomRef.current.setPoints(curve.getPoints(50).flatMap(p => [p.x, p.y, p.z]))
        }
    }
  })

  // Joint to connect the card to the fixed point (simulating a rope)
  useRopeJoint(fixedRef, cardRef, [[0, 0, 0], [0, 1.2, 0], 4])

  return (
    <>
      <RigidBody ref={fixedRef} type="kinematicPosition" position={initialPos as [number, number, number]}>
        <BallCollider args={[0.1]} />
      </RigidBody>

      <RigidBody 
        ref={cardRef} 
        type="dynamic" 
        position={[initialPos[0], initialPos[1] - 3, initialPos[2]]}
        colliders={false}
        angularDamping={0.8}
        linearDamping={0.5}
      >
        <CuboidCollider args={[0.6, 0.9, 0.05]} />
        <mesh 
          onPointerDown={(e) => {
             (e.target as HTMLElement).setPointerCapture(e.pointerId)
             setDragged(new THREE.Vector3())
          }}
          onPointerUp={(e) => {
             (e.target as HTMLElement).releasePointerCapture(e.pointerId)
             setDragged(null)
          }}
        >
          <boxGeometry args={[1.2, 1.8, 0.05]} />
          <meshPhysicalMaterial 
            map={cardTex} 
            clearcoat={1} 
            clearcoatRoughness={0.1} 
            roughness={0.3} 
            metalness={0.2}
          />
        </mesh>
      </RigidBody>

      <group ref={lineRef}>
         <mesh>
            <meshLineGeometry 
              ref={lineGeomRef}
              points={curve.getPoints(50).flatMap(p => [p.x, p.y, p.z])}
            />
            <meshLineMaterial 
              transparent 
              lineWidth={0.08} 
              color="#ffffff"
              map={strapTex}
              useMap={1}
              repeat={new THREE.Vector2(1, 10)}
            />
         </mesh>
      </group>
    </>
  )
}