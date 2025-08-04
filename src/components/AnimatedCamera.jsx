import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 动画相机组件
 * 使用Camera.glb的动画数据驱动相机运动
 */
function AnimatedCamera({ 
  animationExtractor, 
  isPlaying = false, 
  currentTime = 0,
  onCameraUpdate = null
}) {
  const cameraRef = useRef()
  const { set } = useThree()
  
  // 相机默认参数（来自Camera.jsx）
  const defaultCameraParams = {
    position: [13.037, 2.624, 23.379],
    rotation: [0.318, 0.562, -0.051],
    fov: 25.361,
    near: 0.1,
    far: 10000
  }

  // 设置为默认相机并立即应用Phase 1视角
  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current })
      
      // 立即设置Phase 1的理想视角，避免奇怪的初始视角
      const cameraPosition = new THREE.Vector3(-18.43, 14.48, 16.30)
      const targetPosition = new THREE.Vector3(-1.40, 15.30, -1.33)
      
      cameraRef.current.position.copy(cameraPosition)
      cameraRef.current.lookAt(targetPosition)
      cameraRef.current.fov = 35.0
      cameraRef.current.updateProjectionMatrix()
      
      console.log('📹 Animated camera set as default with immediate Phase 1 view')
    }
  }, [set])


  // 每帧更新相机变换
  useFrame(() => {
    if (!cameraRef.current || !animationExtractor?.isReady()) {
      return
    }

    try {
      // 获取当前阶段信息
      const currentPhase = animationExtractor.getCurrentPhase(currentTime)
      
      if (currentPhase.phase === 1) {
        // Phase 1: 始终保持用户定义的理想视角（无论是否播放）
        const cameraPosition = new THREE.Vector3(-18.43, 14.48, 16.30)
        // 使用用户保存的原始理想目标位置
        const targetPosition = new THREE.Vector3(-1.40, 15.30, -1.33)
        
        cameraRef.current.position.copy(cameraPosition)
        cameraRef.current.lookAt(targetPosition)
        cameraRef.current.fov = 35.0 // 使用用户保存的原始FOV
        cameraRef.current.updateProjectionMatrix()
        
        // 确认Phase 1设置（只打印一次）
        if (!cameraRef.current._phase1Confirmed) {
          console.log('✅ Phase 1 理想视角已设置:')
          console.log(`   位置: (${cameraPosition.x}, ${cameraPosition.y}, ${cameraPosition.z})`)
          console.log(`   目标: (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`)
          console.log(`   FOV: ${cameraRef.current.fov}°`)
          cameraRef.current._phase1Confirmed = true
        }
        
        // 通知父组件相机已更新
        if (onCameraUpdate) {
          onCameraUpdate({
            position: [cameraPosition.x, cameraPosition.y, cameraPosition.z],
            rotation: cameraRef.current.rotation.toArray(),
            fov: 35.0
          })
        }
      } else {
        // Phase 2和3或播放中使用动画数据
        const cameraTransform = animationExtractor.getCameraTransformAtTime(currentTime)
        
        // 只在Phase 3中进行结尾调整
        let isInEndAdjustment = false
        let smoothFactor = 0
        
        // 定义缓动函数
        const easeInOutCubic = (t) => {
          return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        
        if (currentPhase.phase === 3) {
          const totalDuration = animationExtractor.getDuration()
          const adjustDuration = 1.5
          const endAdjustStartTime = totalDuration - adjustDuration
          isInEndAdjustment = currentTime >= endAdjustStartTime
          
          const adjustFactor = isInEndAdjustment 
            ? Math.min(1, (currentTime - endAdjustStartTime) / adjustDuration)
            : 0
          
          smoothFactor = easeInOutCubic(adjustFactor)
        }
        
        if (cameraTransform) {
          // 更新相机位置
          if (cameraTransform.position) {
            let x = cameraTransform.position.x
            let y = cameraTransform.position.y
            let z = cameraTransform.position.z
            
            // 只在Phase 3的结尾调整相机位置
            if (currentPhase.phase === 3 && isInEndAdjustment) {
              // 分阶段调整：位置调整在前70%时间内完成，更柔和
              const adjustFactor = (currentTime - (animationExtractor.getDuration() - 1.5)) / 1.5
              const positionFactor = Math.min(1, adjustFactor / 0.7)
              const positionSmooth = easeInOutCubic(positionFactor)
              
              x += 1.5 * positionSmooth
              y += -0.7 * positionSmooth
            }
            
            cameraRef.current.position.set(x, y, z)
          }

          // 更新相机旋转
          if (cameraTransform.rotation) {
            if (cameraTransform.rotation.w !== undefined) {
              // 四元数旋转
              let quat = new THREE.Quaternion(
                cameraTransform.rotation.x,
                cameraTransform.rotation.y,
                cameraTransform.rotation.z,
                cameraTransform.rotation.w
              )
              
              // 只在Phase 3的结尾调整相机角度
              if (currentPhase.phase === 3 && isInEndAdjustment) {
                // 分阶段调整：角度调整从30%开始，在后70%时间内完成
                const adjustFactor = (currentTime - (animationExtractor.getDuration() - 1.5)) / 1.5
                const rotationFactor = adjustFactor > 0.3 ? (adjustFactor - 0.3) / 0.7 : 0
                const rotationSmooth = easeInOutCubic(rotationFactor)
                
                // 创建向左看的额外旋转
                const adjustRotation = new THREE.Quaternion()
                adjustRotation.setFromEuler(new THREE.Euler(0, -0.15 * rotationSmooth, 0))
                
                // 应用额外旋转
                quat.multiply(adjustRotation)
              }
              
              cameraRef.current.setRotationFromQuaternion(quat)
            } else {
              // 欧拉角旋转
              let rotX = cameraTransform.rotation.x
              let rotY = cameraTransform.rotation.y
              let rotZ = cameraTransform.rotation.z
              
              // 只在Phase 3的结尾调整相机角度
              if (currentPhase.phase === 3 && isInEndAdjustment) {
                // 分阶段调整：角度调整从30%开始
                const adjustFactor = (currentTime - (animationExtractor.getDuration() - 1.5)) / 1.5
                const rotationFactor = adjustFactor > 0.3 ? (adjustFactor - 0.3) / 0.7 : 0
                const rotationSmooth = easeInOutCubic(rotationFactor)
                
                rotY += -0.15 * rotationSmooth
              }
              
              cameraRef.current.rotation.set(rotX, rotY, rotZ)
            }
          }

          // 更新FOV
          if (cameraTransform.fov !== undefined) {
            cameraRef.current.fov = cameraTransform.fov
            cameraRef.current.updateProjectionMatrix()
          }

          // 通知父组件相机已更新
          if (onCameraUpdate) {
            onCameraUpdate({
              position: cameraRef.current.position.toArray(),
              rotation: cameraRef.current.rotation.toArray(),
              fov: cameraRef.current.fov
            })
          }
        }
      }
    } catch (error) {
      console.error('Error updating animated camera:', error)
    }
  })

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={true}
      fov={35.0}
      near={defaultCameraParams.near}
      far={defaultCameraParams.far}
    />
  )
}

export default AnimatedCamera