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
      
      if (cameraTransform) {
        // 更新相机位置
        if (cameraTransform.position) {
          cameraRef.current.position.set(
            cameraTransform.position.x,
            cameraTransform.position.y,
            cameraTransform.position.z
          )
        }

        // 更新相机旋转
        if (cameraTransform.rotation) {
          if (cameraTransform.rotation.w !== undefined) {
            // 四元数旋转
            const quat = new THREE.Quaternion(
              cameraTransform.rotation.x,
              cameraTransform.rotation.y,
              cameraTransform.rotation.z,
              cameraTransform.rotation.w
            )
            cameraRef.current.setRotationFromQuaternion(quat)
          } else {
            // 欧拉角旋转
            cameraRef.current.rotation.set(
              cameraTransform.rotation.x,
              cameraTransform.rotation.y,
              cameraTransform.rotation.z
            )
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