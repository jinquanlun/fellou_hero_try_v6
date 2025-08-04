import React, { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import CompleteAnimationScene from './components/CompleteAnimationScene.jsx'
import AnimationControls from './components/AnimationControls.jsx'

/**
 * 主应用组件 - 完整动画场景版本
 */
function App() {
  const [animationInfo, setAnimationInfo] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [cameraState, setCameraState] = useState(null)
  const sceneRef = useRef()

  const handlePlay = () => {
    if (sceneRef.current?.playAnimation) {
      sceneRef.current.playAnimation()
      setIsPlaying(true)
    }
  }

  const handleStop = () => {
    if (sceneRef.current?.stopAnimation) {
      sceneRef.current.stopAnimation()
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const handlePause = () => {
    if (sceneRef.current?.pauseAnimation) {
      sceneRef.current.pauseAnimation()
      setIsPlaying(false)
    }
  }


  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        gl={{ 
          antialias: true,
          alpha: true 
        }}
      >
        <Suspense fallback={<LoadingMesh />}>
          {/* 基础光照 */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          {/* 完整动画场景 */}
          <CompleteAnimationScene 
            ref={sceneRef}
            onAnimationInfoChange={setAnimationInfo}
            onPlayingChange={setIsPlaying}
            onTimeChange={setCurrentTime}
            onCameraUpdate={setCameraState}
          />
          
          {/* 环境 */}
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
      
      {/* 多源动画状态显示 */}
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
          🎬 Three-Phase Animation Scene
        </h3>
        <div>Status: {isPlaying ? '▶️ Playing' : '⏸️ Paused'}</div>
        <div>Time: {currentTime.toFixed(2)}s</div>
        <div>Mode: Three-Phase Animation</div>
        {animationInfo && (
          <div style={{ marginTop: '10px', fontSize: '12px' }}>
            <div>🎯 v6 Original: {animationInfo.v6Original ? '✅' : '❌'}</div>
            <div>📹 Camera: {animationInfo.camera ? '✅' : '❌'}</div>
            <div>🎯 Scenes B Rings: {animationInfo.rings?.length || 0}/3</div>
            <div>⏱️ Total Duration: {animationInfo.totalDuration?.toFixed(2)}s</div>
            {animationInfo.phaseDurations && (
              <div style={{ marginTop: '5px', fontSize: '11px' }}>
                <div>Phase 1: {animationInfo.phaseDurations.phase1?.toFixed(1)}s</div>
                <div>Phase 2: {animationInfo.phaseDurations.phase2?.toFixed(1)}s</div>
                <div>Phase 3: {animationInfo.phaseDurations.phase3?.toFixed(1)}s</div>
              </div>
            )}
          </div>
        )}
        {cameraState && (
          <div style={{ marginTop: '10px', fontSize: '11px' }}>
            <div>📍 Pos: [{cameraState.position?.map(p => p.toFixed(1)).join(', ')}]</div>
            <div>🔍 FOV: {cameraState.fov?.toFixed(1)}°</div>
          </div>
        )}
      </div>


      {/* 动画控制器 */}
      <AnimationControls 
        onPlay={handlePlay}
        onStop={handleStop}
        onPause={handlePause}
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