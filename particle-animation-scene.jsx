import React, { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { animationMappingSystem } from '../animation-mapping-system.js'
import { particleSystemManager } from '../particle-system.js'
import { logConfigSummary } from '../ring-mapping-config.js'

/**
 * 粒子动画场景组件
 * 集成动画映射系统和粒子系统，实现完整的动画效果
 */
export function ParticleAnimationScene({ 
  autoPlay = true,
  showControls = true,
  onInitialized = null,
  ...props 
}) {
  const { scene } = useThree()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState(null)
  const initRef = useRef(false)

  // 初始化所有系统
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const initializeSystems = async () => {
      try {
        console.log('🚀 Initializing Particle Animation Scene...')
        
        // 输出配置摘要
        logConfigSummary()
        
        // 初始化动画映射系统
        console.log('📡 Initializing Animation Mapping System...')
        await animationMappingSystem.initialize()
        
        // 初始化粒子系统管理器
        console.log('🎆 Initializing Particle System Manager...')
        particleSystemManager.initialize(scene)
        
        setIsInitialized(true)
        
        // 自动播放
        if (autoPlay) {
          animationMappingSystem.play()
          setIsPlaying(true)
        }
        
        console.log('✅ Particle Animation Scene initialized successfully')
        
        // 调用初始化完成回调
        if (onInitialized) {
          onInitialized({
            animationSystem: animationMappingSystem,
            particleManager: particleSystemManager
          })
        }
        
      } catch (err) {
        console.error('❌ Failed to initialize Particle Animation Scene:', err)
        setError(err.message)
      }
    }

    initializeSystems()
  }, [scene, autoPlay, onInitialized])

  // 动画循环
  useFrame((state, deltaTime) => {
    if (!isInitialized) return

    try {
      // 更新动画映射系统
      animationMappingSystem.update(deltaTime)
      
      // 更新粒子系统
      particleSystemManager.update(deltaTime)
      
    } catch (err) {
      console.error('Error in animation loop:', err)
    }
  })

  // 清理函数
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up Particle Animation Scene...')
      particleSystemManager.dispose()
    }
  }, [])

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    )
  }

  // 在初始化完成前显示占位符
  if (!isInitialized) {
    return (
      <mesh>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshBasicMaterial color="yellow" wireframe />
      </mesh>
    )
  }

  return null // 粒子系统直接添加到场景中，不需要返回JSX
}

/**
 * 动画控制面板组件
 */
export function AnimationControls({ className = '' }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)

  // 监听系统状态
  useEffect(() => {
    const updateStatus = () => {
      setIsInitialized(animationMappingSystem.isInitialized)
      setIsPlaying(animationMappingSystem.isPlaying)
      setCurrentTime(animationMappingSystem.getCurrentTime())
      setTotalDuration(animationMappingSystem.getTotalDuration())
    }

    const interval = setInterval(updateStatus, 100)
    return () => clearInterval(interval)
  }, [])

  const handlePlay = () => {
    animationMappingSystem.play()
    setIsPlaying(true)
  }

  const handlePause = () => {
    animationMappingSystem.pause()
    setIsPlaying(false)
  }

  const handleStop = () => {
    animationMappingSystem.stop()
    particleSystemManager.clearAll()
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (e) => {
    const progress = parseFloat(e.target.value)
    const time = (progress / 100) * totalDuration
    animationMappingSystem.seekTo(time)
    setCurrentTime(time)
  }

  const handleSpeedChange = (e) => {
    const speed = parseFloat(e.target.value)
    animationMappingSystem.setPlaybackSpeed(speed)
    setPlaybackSpeed(speed)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isInitialized) {
    return (
      <div className={`animation-controls loading ${className}`}>
        <p>Initializing animation system...</p>
      </div>
    )
  }

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div className={`animation-controls ${className}`}>
      <div className="control-row">
        <button onClick={handlePlay} disabled={isPlaying}>
          ▶️ Play
        </button>
        <button onClick={handlePause} disabled={!isPlaying}>
          ⏸️ Pause
        </button>
        <button onClick={handleStop}>
          ⏹️ Stop
        </button>
      </div>
      
      <div className="control-row">
        <span>Time: {formatTime(currentTime)} / {formatTime(totalDuration)}</span>
      </div>
      
      <div className="control-row">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="progress-slider"
        />
      </div>
      
      <div className="control-row">
        <label>Speed: {playbackSpeed}x</label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={playbackSpeed}
          onChange={handleSpeedChange}
          className="speed-slider"
        />
      </div>
    </div>
  )
}

/**
 * 带控制面板的完整粒子动画组件
 */
export function ParticleAnimationWithControls(props) {
  return (
    <>
      <ParticleAnimationScene {...props} />
      {/* 控制面板需要在Canvas外部渲染 */}
    </>
  )
}

/**
 * 动画状态监控组件（调试用）
 */
export function AnimationDebugger() {
  const [status, setStatus] = useState({})

  useEffect(() => {
    const updateStatus = () => {
      if (animationMappingSystem.isInitialized) {
        const newStatus = {
          isPlaying: animationMappingSystem.isPlaying,
          currentTime: animationMappingSystem.getCurrentTime(),
          progress: animationMappingSystem.getProgress(),
          ring1Position: animationMappingSystem.getRingPosition('ring1'),
          ring2Position: animationMappingSystem.getRingPosition('ring2'),
          ring3Position: animationMappingSystem.getRingPosition('ring3'),
          particleCounts: {
            ring1: particleSystemManager.getSystem('ring1')?.particles.length || 0,
            ring2: particleSystemManager.getSystem('ring2')?.particles.length || 0,
            ring3: particleSystemManager.getSystem('ring3')?.particles.length || 0
          }
        }
        setStatus(newStatus)
      }
    }

    const interval = setInterval(updateStatus, 200)
    return () => clearInterval(interval)
  }, [])

  if (!animationMappingSystem.isInitialized) {
    return <div>Animation system not initialized</div>
  }

  return (
    <div className="animation-debugger">
      <h3>Animation Debug Info</h3>
      <div>Playing: {status.isPlaying ? 'Yes' : 'No'}</div>
      <div>Time: {status.currentTime?.toFixed(2)}s</div>
      <div>Progress: {(status.progress * 100)?.toFixed(1)}%</div>
      
      <h4>Ring Positions</h4>
      <div>Ring 1: [{status.ring1Position?.x?.toFixed(2)}, {status.ring1Position?.y?.toFixed(2)}, {status.ring1Position?.z?.toFixed(2)}]</div>
      <div>Ring 2: [{status.ring2Position?.x?.toFixed(2)}, {status.ring2Position?.y?.toFixed(2)}, {status.ring2Position?.z?.toFixed(2)}]</div>
      <div>Ring 3: [{status.ring3Position?.x?.toFixed(2)}, {status.ring3Position?.y?.toFixed(2)}, {status.ring3Position?.z?.toFixed(2)}]</div>
      
      <h4>Particle Counts</h4>
      <div>Ring 1: {status.particleCounts?.ring1}</div>
      <div>Ring 2: {status.particleCounts?.ring2}</div>
      <div>Ring 3: {status.particleCounts?.ring3}</div>
    </div>
  )
}

/**
 * 使用动画系统的自定义hook
 */
export function useParticleAnimation() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const updateStatus = () => {
      setIsInitialized(animationMappingSystem.isInitialized)
      setIsPlaying(animationMappingSystem.isPlaying)
      setCurrentTime(animationMappingSystem.getCurrentTime())
    }

    const interval = setInterval(updateStatus, 100)
    return () => clearInterval(interval)
  }, [])

  return {
    isInitialized,
    isPlaying,
    currentTime,
    totalDuration: animationMappingSystem.getTotalDuration(),
    progress: animationMappingSystem.getProgress(),
    
    // 控制函数
    play: () => animationMappingSystem.play(),
    pause: () => animationMappingSystem.pause(),
    stop: () => {
      animationMappingSystem.stop()
      particleSystemManager.clearAll()
    },
    seekTo: (time) => animationMappingSystem.seekTo(time),
    setSpeed: (speed) => animationMappingSystem.setPlaybackSpeed(speed),
    
    // 数据获取函数
    getRingPosition: (ringId) => animationMappingSystem.getRingPosition(ringId),
    getParticleCount: (ringId) => particleSystemManager.getSystem(ringId)?.particles.length || 0,
    
    // 系统引用
    animationSystem: animationMappingSystem,
    particleManager: particleSystemManager
  }
}