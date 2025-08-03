import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import AnimatedCamera from './AnimatedCamera.jsx'
import { multiSourceAnimationExtractor } from './MultiSourceAnimationExtractor.js'
import * as THREE from 'three'

/**
 * 完整动画场景组件
 * 集成相机动画、环动画和粒子系统
 */
const CompleteAnimationScene = forwardRef(({ 
  onAnimationInfoChange,
  onPlayingChange,
  onTimeChange,
  onCameraUpdate
}, ref) => {
  const sceneRef = useRef()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [animationInfo, setAnimationInfo] = useState(null)
  const [cameraState, setCameraState] = useState(null)

  // 加载v6模型用于显示静态环（可选）
  const { nodes: v6Nodes, materials: v6Materials } = useGLTF('/LOST_cut2_v6-transformed.glb')

  // 初始化多源动画系统
  useEffect(() => {
    const initializeAnimations = async () => {
      try {
        console.log('🚀 Initializing Complete Animation Scene...')
        
        // 初始化多源动画提取器
        const animationData = await multiSourceAnimationExtractor.initialize()
        
        // 构建动画信息
        const info = {
          camera: animationData.camera ? {
            name: 'Camera Animation',
            duration: animationData.camera.duration,
            tracks: animationData.camera.metadata.tracks.length
          } : null,
          rings: Object.entries(animationData.rings).map(([ringId, data]) => ({
            id: ringId,
            name: data?.metadata.objectName || ringId,
            duration: data?.duration || 0,
            tracks: data?.metadata.tracks.length || 0,
            hasAnimation: !!data
          })),
          totalDuration: multiSourceAnimationExtractor.getDuration()
        }

        setAnimationInfo(info)
        setIsInitialized(true)

        // 通知父组件
        if (onAnimationInfoChange) {
          onAnimationInfoChange(info)
        }

        console.log('✅ Complete Animation Scene initialized successfully')
        
      } catch (error) {
        console.error('❌ Failed to initialize Complete Animation Scene:', error)
      }
    }

    initializeAnimations()
  }, [onAnimationInfoChange])

  // 暴露控制方法给父组件
  useImperativeHandle(ref, () => ({
    playAnimation: () => {
      if (isInitialized) {
        setIsPlaying(true)
        if (onPlayingChange) onPlayingChange(true)
        console.log('▶️ Playing complete animation')
      }
    },
    stopAnimation: () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (onPlayingChange) onPlayingChange(false)
      if (onTimeChange) onTimeChange(0)
      console.log('⏹️ Stopped complete animation')
    },
    pauseAnimation: () => {
      setIsPlaying(false)
      if (onPlayingChange) onPlayingChange(false)
      console.log('⏸️ Paused complete animation')
    },
    seekTo: (time) => {
      setCurrentTime(time)
      if (onTimeChange) onTimeChange(time)
    }
  }))

  // 动画循环
  useFrame((state, deltaTime) => {
    if (!isInitialized || !isPlaying) return

    // 更新动画时间
    const newTime = currentTime + deltaTime
    const totalDuration = multiSourceAnimationExtractor.getDuration()
    
    // 循环播放
    const normalizedTime = totalDuration > 0 ? newTime % totalDuration : 0
    
    setCurrentTime(normalizedTime)
    if (onTimeChange) onTimeChange(normalizedTime)
  })

  // 处理相机更新
  const handleCameraUpdate = (cameraData) => {
    setCameraState(cameraData)
    if (onCameraUpdate) onCameraUpdate(cameraData)
  }

  return (
    <group ref={sceneRef}>
      {/* 动画相机 */}
      <AnimatedCamera
        animationExtractor={multiSourceAnimationExtractor}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onCameraUpdate={handleCameraUpdate}
      />

      {/* 动画环（使用v6几何体 + Scenes B动画数据） */}
      <AnimatedRings
        animationExtractor={multiSourceAnimationExtractor}
        isPlaying={isPlaying}
        currentTime={currentTime}
        v6Nodes={v6Nodes}
        v6Materials={v6Materials}
      />

      {/* 素白艺术体 */}
      {v6Nodes['素白艺术™_-_subycnvip'] && v6Materials.PaletteMaterial002 && (
        <mesh 
          name="素白艺术™_-_subycnvip" 
          geometry={v6Nodes['素白艺术™_-_subycnvip'].geometry} 
          material={v6Materials.PaletteMaterial002} 
          position={[-2.372, 15.102, -2.263]} 
          rotation={[-0.834, -0.414, -1.988]} 
          scale={0.037} 
        />
      )}

    </group>
  )
})


/**
 * 动画环组件 - 使用v6模型几何体 + Scenes B动画数据
 */
function AnimatedRings({ animationExtractor, isPlaying, currentTime, v6Nodes, v6Materials }) {
  const ring1Ref = useRef()
  const ring2Ref = useRef()
  const ring3Ref = useRef()

  useFrame(() => {
    if (!animationExtractor?.isReady() || !isPlaying) return

    try {
      // 获取所有环的变换数据
      const transforms = animationExtractor.getAllTransformsAtTime(currentTime)
      
      // 计算动画结尾调整（最后1.5秒开始调整，与相机同步）
      const totalDuration = animationExtractor.getDuration()
      const adjustDuration = 1.5 // 与相机调整时间同步
      const endAdjustStartTime = totalDuration - adjustDuration
      const isInEndAdjustment = currentTime >= endAdjustStartTime
      
      // 平滑调整因子 (0 到 1)
      const adjustFactor = isInEndAdjustment 
        ? Math.min(1, (currentTime - endAdjustStartTime) / adjustDuration)
        : 0
      
      // 使用与相机相同的高级缓动函数
      const easeInOutCubic = (t) => {
        return t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2
      }
      
      const smoothFactor = easeInOutCubic(adjustFactor)
      
      // 调试信息
      if (isInEndAdjustment && adjustFactor > 0) {
        console.log(`🎯 End Adjustment: time=${currentTime.toFixed(2)}, factor=${adjustFactor.toFixed(2)}, smooth=${smoothFactor.toFixed(2)}`)
      }

      // 更新Ring 1 - Scenes_B_00100
      if (ring1Ref.current && transforms.rings.ring1) {
        const t = transforms.rings.ring1
        if (t.position) {
          // 保持原始位置，不做任何调整
          ring1Ref.current.position.set(t.position.x, t.position.y, t.position.z)
        }
        if (t.rotation) {
          if (t.rotation.w !== undefined) {
            const quat = new THREE.Quaternion(t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w)
            ring1Ref.current.setRotationFromQuaternion(quat)
          } else {
            ring1Ref.current.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z)
          }
        }
        if (t.scale) {
          // 结尾调整：显著放大
          const scaleMultiplier = 1 + smoothFactor * 0.5 // 增加50%（大幅增强）
          
          if (isInEndAdjustment) {
            console.log(`Ring1 缩放: 原始scale=${t.scale.x.toFixed(3)}, 倍数=${scaleMultiplier.toFixed(2)}`)
          }
          
          ring1Ref.current.scale.set(
            t.scale.x * scaleMultiplier, 
            t.scale.y * scaleMultiplier, 
            t.scale.z * scaleMultiplier
          )
        }
      }

      // 更新Ring 2 - Scenes_B_0023
      if (ring2Ref.current && transforms.rings.ring2) {
        const t = transforms.rings.ring2
        if (t.position) {
          // 保持原始位置，不做任何调整
          ring2Ref.current.position.set(t.position.x, t.position.y, t.position.z)
        }
        if (t.rotation) {
          if (t.rotation.w !== undefined) {
            const quat = new THREE.Quaternion(t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w)
            ring2Ref.current.setRotationFromQuaternion(quat)
          } else {
            ring2Ref.current.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z)
          }
        }
        if (t.scale) {
          // 结尾调整：显著放大
          const scaleMultiplier = 1 + smoothFactor * 0.5 // 增加50%（大幅增强）
          
          ring2Ref.current.scale.set(
            t.scale.x * scaleMultiplier, 
            t.scale.y * scaleMultiplier, 
            t.scale.z * scaleMultiplier
          )
        }
      }

      // 更新Ring 3 - Scenes_B_00100001
      if (ring3Ref.current && transforms.rings.ring3) {
        const t = transforms.rings.ring3
        if (t.position) {
          // 保持原始位置，不做任何调整
          ring3Ref.current.position.set(t.position.x, t.position.y, t.position.z)
        }
        if (t.rotation) {
          if (t.rotation.w !== undefined) {
            const quat = new THREE.Quaternion(t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w)
            ring3Ref.current.setRotationFromQuaternion(quat)
          } else {
            ring3Ref.current.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z)
          }
        }
        if (t.scale) {
          // 结尾调整：显著放大
          const scaleMultiplier = 1 + smoothFactor * 0.5 // 增加50%（大幅增强）
          
          ring3Ref.current.scale.set(
            t.scale.x * scaleMultiplier, 
            t.scale.y * scaleMultiplier, 
            t.scale.z * scaleMultiplier
          )
        }
      }

    } catch (error) {
      console.error('Error updating animated rings:', error)
    }
  })

  if (!v6Nodes || !v6Materials) {
    console.warn('v6 nodes or materials not available for AnimatedRings')
    return null
  }

  return (
    <group name="AnimatedRings">
      {/* Ring 1 - 使用v6几何体 + Scenes B 00100动画 */}
      <group 
        ref={ring1Ref} 
        name="Scenes_B_00100_animated" 
        position={[0.609, 14.249, -5.731]} 
        rotation={[-0.018, 0.004, 2.077]} 
        scale={0.026}
      >
        {v6Nodes.網格003 && (
          <mesh geometry={v6Nodes.網格003.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_1 && (
          <mesh geometry={v6Nodes.網格003_1.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_2 && (
          <mesh geometry={v6Nodes.網格003_2.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_3 && (
          <mesh geometry={v6Nodes.網格003_3.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_4 && (
          <mesh geometry={v6Nodes.網格003_4.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_5 && (
          <mesh geometry={v6Nodes.網格003_5.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_6 && (
          <mesh geometry={v6Nodes.網格003_6.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_7 && (
          <mesh geometry={v6Nodes.網格003_7.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_8 && (
          <mesh geometry={v6Nodes.網格003_8.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格003_9 && (
          <mesh geometry={v6Nodes.網格003_9.geometry} material={v6Materials.PaletteMaterial001} />
        )}
      </group>

      {/* Ring 2 - 使用v6几何体 + Scenes B 0023动画 */}
      <group 
        ref={ring2Ref} 
        name="Scenes_B_0023_animated" 
        position={[11.171, 3.182, 11.142]} 
        rotation={[-1.132, -0.089, -2.546]} 
        scale={0.039}
      >
        {v6Nodes.網格002 && (
          <mesh geometry={v6Nodes.網格002.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_1 && (
          <mesh geometry={v6Nodes.網格002_1.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_2 && (
          <mesh geometry={v6Nodes.網格002_2.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_3 && (
          <mesh geometry={v6Nodes.網格002_3.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_4 && (
          <mesh geometry={v6Nodes.網格002_4.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_5 && (
          <mesh geometry={v6Nodes.網格002_5.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_6 && (
          <mesh geometry={v6Nodes.網格002_6.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_7 && (
          <mesh geometry={v6Nodes.網格002_7.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_8 && (
          <mesh geometry={v6Nodes.網格002_8.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格002_9 && (
          <mesh geometry={v6Nodes.網格002_9.geometry} material={v6Materials.PaletteMaterial001} />
        )}
      </group>

      {/* Ring 3 - 使用v6几何体 + Scenes B 00100.001动画 */}
      <group 
        ref={ring3Ref} 
        name="Scenes_B_00100001_animated" 
        position={[0.609, 0.7, 6.831]} 
        rotation={[-0.024, 0, 2.269]} 
        scale={[0.026, 0.026, 0.016]}
      >
        {v6Nodes.網格001 && (
          <mesh geometry={v6Nodes.網格001.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_1 && (
          <mesh geometry={v6Nodes.網格001_1.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_2 && (
          <mesh geometry={v6Nodes.網格001_2.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_3 && (
          <mesh geometry={v6Nodes.網格001_3.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_4 && (
          <mesh geometry={v6Nodes.網格001_4.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_5 && (
          <mesh geometry={v6Nodes.網格001_5.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_6 && (
          <mesh geometry={v6Nodes.網格001_6.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_7 && (
          <mesh geometry={v6Nodes.網格001_7.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_8 && (
          <mesh geometry={v6Nodes.網格001_8.geometry} material={v6Materials.PaletteMaterial001} />
        )}
        {v6Nodes.網格001_9 && (
          <mesh geometry={v6Nodes.網格001_9.geometry} material={v6Materials.PaletteMaterial001} />
        )}
      </group>
    </group>
  )
}


export default CompleteAnimationScene