import React, { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import AnimationAnalyzer from './AnimationAnalyzer.jsx'
import AnimationControls from './AnimationControls.jsx'

/**
 * 主应用组件 - 简化测试版本
 */
function App() {
  const [animationInfo, setAnimationInfo] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const analyzerRef = useRef()

  const handlePlay = () => {
    if (analyzerRef.current?.playAnimation) {
      analyzerRef.current.playAnimation()
      setIsPlaying(true)
    }
  }

  const handleStop = () => {
    if (analyzerRef.current?.stopAnimation) {
      analyzerRef.current.stopAnimation()
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ 
          position: [20, 10, 20], 
          fov: 60,
          near: 0.1,
          far: 1000 
        }}
        gl={{ 
          antialias: true,
          alpha: true 
        }}
      >
        <Suspense fallback={<LoadingMesh />}>
          {/* 基础光照 */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          {/* 动画分析器 */}
          <AnimationAnalyzer 
            ref={analyzerRef}
            onAnimationInfoChange={setAnimationInfo}
            onPlayingChange={setIsPlaying}
            onTimeChange={setCurrentTime}
          />
          
          {/* 相机控制 */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            target={[0, 5, 0]}
          />
          
          {/* 环境 */}
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
      
      {/* 简单的状态显示 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: '#00ff00',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        border: '1px solid #00ff00'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>
          🔍 V6 Animation Analyzer
        </h3>
        <div>Status: Analyzing v6 model...</div>
        <div>Mode: Debug Mode</div>
        <div>Check console for detailed logs</div>
      </div>

      {/* 动画控制器 */}
      <AnimationControls 
        onPlay={handlePlay}
        onStop={handleStop}
        isPlaying={isPlaying}
        currentTime={currentTime}
        animationInfo={animationInfo}
      />
    </div>
  )
}

/**
 * 加载组件
 */
function LoadingMesh() {
  return (
    <mesh>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="yellow" wireframe />
    </mesh>
  )
}

export default App