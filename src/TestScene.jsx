import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 测试场景组件
 * 先验证GLB文件加载和基础3D渲染
 */
function TestScene() {
  const [currentModel, setCurrentModel] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // 可用的模型列表
  const models = [
    { 
      path: '/Camera-transformed.glb', 
      name: 'Camera',
      position: [0, 0, 0],
      scale: 1
    },
    { 
      path: '/Scenes_B_00100-transformed.glb', 
      name: 'Scenes B 00100',
      position: [0, 5, 0],
      scale: 0.5
    },
    { 
      path: '/Scenes_B_0023-transformed.glb', 
      name: 'Scenes B 0023',
      position: [5, 0, 0],
      scale: 0.5
    },
    { 
      path: '/LOST_cut2_v6-transformed.glb', 
      name: 'LOST v6',
      position: [-5, 0, 0],
      scale: 0.3
    }
  ]

  // 自动切换模型
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentModel(prev => (prev + 1) % models.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <group>
      {/* 显示当前加载的模型 */}
      <ModelDisplay 
        model={models[currentModel]} 
        onLoad={() => setIsLoading(false)}
        onError={setError}
      />
      
      {/* 参考环形结构 - 代表v6中的三个环 */}
      <ReferenceRings />
      
      {/* 简单的粒子效果测试 */}
      <TestParticles />
      
      {/* 信息显示 */}
      <InfoDisplay 
        currentModel={models[currentModel].name}
        isLoading={isLoading}
        error={error}
      />
    </group>
  )
}

/**
 * 模型显示组件
 */
function ModelDisplay({ model, onLoad, onError }) {
  try {
    const { scene, animations } = useGLTF(model.path)
    
    useEffect(() => {
      if (scene) {
        console.log(`✅ Loaded model: ${model.name}`)
        console.log(`📊 Animations: ${animations?.length || 0}`)
        onLoad()
      }
    }, [scene, animations, onLoad])

    return (
      <primitive 
        object={scene.clone()} 
        position={model.position}
        scale={model.scale}
      />
    )
  } catch (error) {
    console.error(`❌ Failed to load ${model.name}:`, error)
    useEffect(() => {
      onError(error.message)
    }, [error, onError])
    
    return (
      <mesh position={model.position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
    )
  }
}

/**
 * 参考环形结构
 */
function ReferenceRings() {
  return (
    <group>
      {/* Ring 1 - 对应 Scenes_B_00100 */}
      <mesh position={[0.609, 14.249, -5.731]}>
        <torusGeometry args={[2, 0.3, 8, 16]} />
        <meshBasicMaterial 
          color={0x00ff88} 
          transparent 
          opacity={0.3}
          wireframe 
        />
      </mesh>
      
      {/* Ring 2 - 对应 Scenes_B_0023 */}
      <mesh position={[11.171, 3.182, 11.142]}>
        <torusGeometry args={[1.5, 0.25, 8, 16]} />
        <meshBasicMaterial 
          color={0xff6600} 
          transparent 
          opacity={0.3}
          wireframe 
        />
      </mesh>
      
      {/* Ring 3 - 对应 Scenes_B_00100001 */}
      <mesh position={[0.609, 0.7, 6.831]}>
        <torusGeometry args={[2.2, 0.35, 8, 16]} />
        <meshBasicMaterial 
          color={0x0066ff} 
          transparent 
          opacity={0.3}
          wireframe 
        />
      </mesh>
    </group>
  )
}

/**
 * 测试粒子效果
 */
function TestParticles() {
  const particlesRef = useRef()
  const [time, setTime] = useState(0)

  useFrame((state, deltaTime) => {
    setTime(prev => prev + deltaTime)
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += deltaTime * 0.5
    }
  })

  // 创建简单的粒子几何体
  const particleCount = 1000
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    // 随机分布粒子
    positions[i * 3] = (Math.random() - 0.5) * 20
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20

    // 随机颜色
    const color = new THREE.Color()
    color.setHSL(Math.random(), 0.8, 0.6)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={particleCount}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors={true}
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/**
 * 信息显示组件
 */
function InfoDisplay({ currentModel, isLoading, error }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5 + 15
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 15, 0]}>
      <planeGeometry args={[8, 2]} />
      <meshBasicMaterial 
        color={error ? 0xff0000 : isLoading ? 0xffff00 : 0x00ff00}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

export default TestScene