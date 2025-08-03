import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { 
  ParticleAnimationScene, 
  AnimationControls,
  AnimationDebugger,
  useParticleAnimation 
} from './particle-animation-scene.jsx'

/**
 * 主应用组件示例
 * 展示如何集成粒子动画系统到Three.js场景中
 */
export function ParticleAnimationApp() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Three.js Canvas */}
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
        <Suspense fallback={<LoadingIndicator />}>
          {/* 环境光照 */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          {/* 环境贴图 */}
          <Environment preset="sunset" />
          
          {/* 粒子动画场景 */}
          <ParticleAnimationScene 
            autoPlay={true}
            onInitialized={(systems) => {
              console.log('🎉 Animation systems ready:', systems)
            }}
          />
          
          {/* 可选：显示原始v6模型作为参考 */}
          <ReferenceV6Model opacity={0.1} />
          
          {/* 相机控制 */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            target={[0, 5, 0]}
          />
        </Suspense>
      </Canvas>
      
      {/* UI控制面板 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'monospace'
      }}>
        <AnimationControls />
      </div>
      
      {/* 调试信息面板 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '300px'
      }}>
        <AnimationDebugger />
      </div>
    </div>
  )
}

/**
 * 加载指示器
 */
function LoadingIndicator() {
  return (
    <mesh>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="yellow" wireframe />
    </mesh>
  )
}

/**
 * 参考v6模型（可选显示）
 */
function ReferenceV6Model({ opacity = 0.1 }) {
  return (
    <group>
      {/* Ring 1 */}
      <mesh position={[0.609, 14.249, -5.731]}>
        <torusGeometry args={[2, 0.5, 8, 16]} />
        <meshBasicMaterial 
          color={0x00ff88} 
          transparent 
          opacity={opacity}
          wireframe 
        />
      </mesh>
      
      {/* Ring 2 */}
      <mesh position={[11.171, 3.182, 11.142]}>
        <torusGeometry args={[1.5, 0.4, 8, 16]} />
        <meshBasicMaterial 
          color={0xff6600} 
          transparent 
          opacity={opacity}
          wireframe 
        />
      </mesh>
      
      {/* Ring 3 */}
      <mesh position={[0.609, 0.7, 6.831]}>
        <torusGeometry args={[2.2, 0.6, 8, 16]} />
        <meshBasicMaterial 
          color={0x0066ff} 
          transparent 
          opacity={opacity}
          wireframe 
        />
      </mesh>
    </group>
  )
}

/**
 * 带自定义控制的高级示例
 */
export function AdvancedParticleExample() {
  const animation = useParticleAnimation()
  
  const handleCustomAction = () => {
    if (!animation.isInitialized) return
    
    // 自定义动画控制逻辑
    animation.stop()
    setTimeout(() => {
      animation.setSpeed(2.0)
      animation.play()
    }, 500)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [15, 8, 15] }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} />
        
        <ParticleAnimationScene autoPlay={false} />
        <OrbitControls />
      </Canvas>
      
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px'
      }}>
        <button 
          onClick={animation.play}
          disabled={!animation.isInitialized || animation.isPlaying}
          style={buttonStyle}
        >
          Play Animation
        </button>
        
        <button 
          onClick={animation.pause}
          disabled={!animation.isPlaying}
          style={buttonStyle}
        >
          Pause
        </button>
        
        <button 
          onClick={animation.stop}
          style={buttonStyle}
        >
          Stop
        </button>
        
        <button 
          onClick={handleCustomAction}
          disabled={!animation.isInitialized}
          style={buttonStyle}
        >
          2x Speed Replay
        </button>
      </div>
    </div>
  )
}

const buttonStyle = {
  padding: '10px 20px',
  backgroundColor: '#007acc',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px'
}

/**
 * 性能监控示例
 */
export function PerformanceMonitorExample() {
  const animation = useParticleAnimation()
  const [stats, setStats] = React.useState({
    fps: 0,
    totalParticles: 0,
    memoryUsage: 0
  })

  React.useEffect(() => {
    const updateStats = () => {
      const totalParticles = ['ring1', 'ring2', 'ring3']
        .reduce((sum, ringId) => sum + animation.getParticleCount(ringId), 0)
      
      setStats({
        fps: Math.round(1000 / 16.67), // 简化的FPS计算
        totalParticles,
        memoryUsage: performance.memory?.usedJSHeapSize || 0
      })
    }

    const interval = setInterval(updateStats, 1000)
    return () => clearInterval(interval)
  }, [animation])

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.9)',
      color: '#00ff00',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      border: '1px solid #00ff00'
    }}>
      <div>FPS: {stats.fps}</div>
      <div>Particles: {stats.totalParticles}</div>
      <div>Memory: {(stats.memoryUsage / 1024 / 1024).toFixed(1)} MB</div>
      <div>Status: {animation.isInitialized ? 'Ready' : 'Loading'}</div>
    </div>
  )
}

/**
 * 导出默认组件
 */
export default ParticleAnimationApp

/**
 * 使用说明和API文档
 */
export const USAGE_DOCUMENTATION = `
# 粒子动画系统使用指南

## 基础使用

\`\`\`jsx
import { ParticleAnimationApp } from './example-usage.jsx'

function App() {
  return <ParticleAnimationApp />
}
\`\`\`

## 组件API

### ParticleAnimationScene
- autoPlay: boolean - 自动播放动画
- showControls: boolean - 显示控制面板
- onInitialized: function - 初始化完成回调

### useParticleAnimation Hook
返回对象包含：
- isInitialized: 系统是否已初始化
- isPlaying: 是否正在播放
- currentTime: 当前播放时间
- totalDuration: 总时长
- play(), pause(), stop(): 控制函数
- getRingPosition(ringId): 获取环位置
- getParticleCount(ringId): 获取粒子数量

## 配置

在 ring-mapping-config.js 中修改：
- 粒子数量和大小
- 颜色和发光效果
- 发射速率和生命周期
- 轨迹长度

## 性能优化

- 调整 particleCount 以平衡视觉效果和性能
- 使用 emissionRate 控制粒子发射频率
- 适当的 lifetime 避免过多粒子累积
`