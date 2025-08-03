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

  // 设置为默认相机
  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current })
      console.log('📹 Animated camera set as default')
    }
  }, [set])

  // 每帧更新相机变换
  useFrame(() => {
    if (!cameraRef.current || !animationExtractor?.isReady() || !isPlaying) {
      return
    }

    try {
      // 从动画提取器获取相机变换数据
      const cameraTransform = animationExtractor.getCameraTransformAtTime(currentTime)
      
      // 计算结尾调整（最后1.5秒开始调整视角让圆环居中）
      const totalDuration = animationExtractor.getDuration()
      const adjustDuration = 1.5 // 延长过渡时间
      const endAdjustStartTime = totalDuration - adjustDuration
      const isInEndAdjustment = currentTime >= endAdjustStartTime
      
      // 平滑调整因子 (0 到 1)
      const adjustFactor = isInEndAdjustment 
        ? Math.min(1, (currentTime - endAdjustStartTime) / adjustDuration)
        : 0
      
      // 更高级的缓动函数 - easeInOutCubic (更丝滑)
      const easeInOutCubic = (t) => {
        return t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2
      }
      
      const smoothFactor = easeInOutCubic(adjustFactor)
      
      if (cameraTransform) {
        // 更新相机位置
        if (cameraTransform.position) {
          let x = cameraTransform.position.x
          let y = cameraTransform.position.y
          let z = cameraTransform.position.z
          
          // 结尾调整：微调相机位置让构图更居中
          if (isInEndAdjustment) {
            // 分阶段调整：位置调整在前70%时间内完成，更柔和
            const positionFactor = Math.min(1, adjustFactor / 0.7)
            const positionSmooth = easeInOutCubic(positionFactor)
            
            x += 1.5 * positionSmooth  // 稍微减小调整幅度，更自然
            y += -0.7 * positionSmooth // 稍微减小调整幅度
            
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
            
            // 结尾调整：微调相机角度指向圆环中心
            if (isInEndAdjustment) {
              // 分阶段调整：角度调整从30%开始，在后70%时间内完成
              const rotationFactor = adjustFactor > 0.3 ? (adjustFactor - 0.3) / 0.7 : 0
              const rotationSmooth = easeInOutCubic(rotationFactor)
              
              // 创建向左看的额外旋转，减小幅度更自然
              const adjustRotation = new THREE.Quaternion()
              adjustRotation.setFromEuler(new THREE.Euler(0, -0.15 * rotationSmooth, 0)) // 减小角度调整
              
              // 应用额外旋转
              quat.multiply(adjustRotation)
            }
            
            cameraRef.current.setRotationFromQuaternion(quat)
          } else {
            // 欧拉角旋转
            let rotX = cameraTransform.rotation.x
            let rotY = cameraTransform.rotation.y
            let rotZ = cameraTransform.rotation.z
            
            // 结尾调整：微调相机角度
            if (isInEndAdjustment) {
              // 分阶段调整：角度调整从30%开始
              const rotationFactor = adjustFactor > 0.3 ? (adjustFactor - 0.3) / 0.7 : 0
              const rotationSmooth = easeInOutCubic(rotationFactor)
              
              rotY += -0.15 * rotationSmooth // 减小角度调整，向左转
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
    } catch (error) {
      console.error('Error updating animated camera:', error)
    }
  })

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={true}
      position={defaultCameraParams.position}
      rotation={defaultCameraParams.rotation}
      fov={defaultCameraParams.fov}
      near={defaultCameraParams.near}
      far={defaultCameraParams.far}
    />
  )
}

export default AnimatedCamera