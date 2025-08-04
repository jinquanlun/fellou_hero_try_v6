import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import AnimatedCamera from './AnimatedCamera.jsx'
import { multiSourceAnimationExtractor } from '../systems/MultiSourceAnimationExtractor.js'
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
  const [phase1Time, setPhase1Time] = useState(0) // Phase 1独立的时间计数

  const [currentPhase, setCurrentPhase] = useState({ phase: 1, phaseTime: 0, progress: 0 })

  // 加载v6模型用于显示静态环
  const gltfResult = useGLTF('/LOST_cut2_v6-transformed.glb')
  const { nodes: v6Nodes, materials: v6Materials } = gltfResult
  
  // 调试v6模型加载状态
  useEffect(() => {
    console.log('🔍 v6模型加载状态检查:')
    console.log('   gltfResult:', gltfResult)
    console.log('   v6Nodes存在:', !!v6Nodes)
    console.log('   v6Materials存在:', !!v6Materials)
    
    if (v6Nodes && v6Materials) {
      console.log('✅ v6模型加载成功:')
      console.log('   Nodes数量:', Object.keys(v6Nodes).length)
      console.log('   Nodes列表:', Object.keys(v6Nodes))
      console.log('   Materials数量:', Object.keys(v6Materials).length) 
      console.log('   Materials列表:', Object.keys(v6Materials))
      console.log('   重要节点检查:')
      console.log('   - 網格001:', !!v6Nodes.網格001)
      console.log('   - 網格002:', !!v6Nodes.網格002) 
      console.log('   - 網格003:', !!v6Nodes.網格003)
      console.log('   - PaletteMaterial001:', !!v6Materials.PaletteMaterial001)
      
      // 检查所有网格节点
      Object.keys(v6Nodes).forEach(nodeName => {
        if (nodeName.includes('網格')) {
          console.log(`   - ${nodeName}:`, !!v6Nodes[nodeName])
        }
      })
    } else {
      console.warn('⚠️ v6模型加载失败或还在加载中')
      console.log('   文件路径: /LOST_cut2_v6-transformed.glb')
      console.log('   请确认文件存在于: /Users/quan/cursor/fellou_try_v6/public/LOST_cut2_v6-transformed.glb')
    }
  }, [v6Nodes, v6Materials, gltfResult])

  // 初始化多源动画系统
  useEffect(() => {
    const initializeAnimations = async () => {
      try {
        console.log('🚀 Initializing Complete Animation Scene...')
        
        // 初始化多源动画提取器
        const animationData = await multiSourceAnimationExtractor.initialize()
        
        // 构建动画信息
        const info = {
          v6Original: animationData.v6Original ? {
            name: 'v6 Original Animation',
            duration: animationData.v6Original.duration,
            tracks: animationData.v6Original.metadata.tracks.length
          } : null,
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
          totalDuration: multiSourceAnimationExtractor.getDuration(),
          phaseDurations: multiSourceAnimationExtractor.getPhaseDurations()
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
      setPhase1Time(0) // 重置Phase 1时间
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
    },
    getCameraControlData: () => ({
      currentPhase
    })
  }))

  // 动画循环
  useFrame((state, deltaTime) => {
    if (!isInitialized) return

    if (isPlaying) {
      // 播放中：更新总体动画时间
      const newTime = currentTime + deltaTime
      const totalDuration = multiSourceAnimationExtractor.getDuration()
      
      // 循环播放
      const normalizedTime = totalDuration > 0 ? newTime % totalDuration : 0
      
      setCurrentTime(normalizedTime)
      if (onTimeChange) onTimeChange(normalizedTime)
    } else {
      // 未播放时：更新Phase 1的独立时间（让圆环转动）
      const newPhase1Time = phase1Time + deltaTime
      const v6Duration = multiSourceAnimationExtractor.animationData?.v6Original?.duration || 10
      const normalizedPhase1Time = v6Duration > 0 ? newPhase1Time % v6Duration : 0
      
      setPhase1Time(normalizedPhase1Time)
    }

    // 更新当前阶段信息
    if (multiSourceAnimationExtractor.isReady()) {
      const phaseInfo = multiSourceAnimationExtractor.getCurrentPhase(currentTime)
      setCurrentPhase(phaseInfo)
    }
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
        phase1Time={phase1Time}
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
function AnimatedRings({ animationExtractor, isPlaying, currentTime, phase1Time, v6Nodes, v6Materials }) {
  const ring1Ref = useRef()
  const ring2Ref = useRef()
  const ring3Ref = useRef()

  useFrame(() => {
    if (!animationExtractor?.isReady()) return
    
    // 决定使用哪个时间：播放中用currentTime，Phase 1静态时用phase1Time
    const phaseInfo = animationExtractor.getCurrentPhase(currentTime)
    const shouldAnimate = isPlaying || phaseInfo.phase === 1
    
    
    if (!shouldAnimate) return

    try {
      // Phase 1且未播放时，使用phase1Time来播放v6原始动画
      const timeToUse = (!isPlaying && phaseInfo.phase === 1) ? phase1Time : currentTime
      
      // 获取所有环的变换数据（包含阶段信息）
      const transforms = animationExtractor.getAllTransformsAtTime(timeToUse)
      const currentPhase = transforms.phase
      
      // 只在Phase 3中进行结尾调整
      let isInEndAdjustment = false
      let smoothFactor = 0
      
      if (currentPhase.phase === 3) {
        const totalDuration = animationExtractor.getDuration()
        const adjustDuration = 1.5 // 与相机调整时间同步
        const endAdjustStartTime = totalDuration - adjustDuration
        isInEndAdjustment = currentTime >= endAdjustStartTime
        
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
        
        smoothFactor = easeInOutCubic(adjustFactor)
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
          // 只在Phase 3的结尾调整中放大
          const scaleMultiplier = (currentPhase.phase === 3 && isInEndAdjustment) ? 1 + smoothFactor * 0.5 : 1
          
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
          // 只在Phase 3的结尾调整中放大
          const scaleMultiplier = (currentPhase.phase === 3 && isInEndAdjustment) ? 1 + smoothFactor * 0.5 : 1
          
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
          // 只在Phase 3的结尾调整中放大
          const scaleMultiplier = (currentPhase.phase === 3 && isInEndAdjustment) ? 1 + smoothFactor * 0.5 : 1
          
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