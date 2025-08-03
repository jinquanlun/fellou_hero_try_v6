import React, { useState, useEffect } from 'react'
import * as THREE from 'three'
import { animationExtractor } from './animation-extractor.js'
import { 
  V6_RINGS_CONFIG, 
  getAnimationMapping, 
  getRingConfig 
} from './ring-mapping-config.js'

/**
 * 动画映射系统
 * 负责将Scenes B的动画数据映射到v6环的粒子系统
 */
export class AnimationMappingSystem {
  constructor() {
    this.ringAnimations = new Map() // 存储提取的动画数据
    this.ringTransforms = new Map() // 存储当前变换状态
    this.isInitialized = false
    this.globalTime = 0
    this.isPlaying = false
    this.playbackSpeed = 1.0
    
    // 初始化环的基础变换
    this.initializeRingTransforms()
  }

  /**
   * 初始化系统，提取所有环的动画数据
   */
  async initialize() {
    console.log('🎬 Initializing Animation Mapping System...')
    
    try {
      // 为每个环提取动画数据
      for (const ringId of ['ring1', 'ring2', 'ring3']) {
        console.log(`📡 Loading animation data for ${ringId}...`)
        
        const animationData = await animationExtractor.extractRingAnimation(ringId)
        this.ringAnimations.set(ringId, animationData)
        
        console.log(`✅ ${ringId} animation loaded: ${animationData.duration}s duration`)
      }

      this.isInitialized = true
      console.log('🎯 Animation Mapping System initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize Animation Mapping System:', error)
      throw error
    }
  }

  /**
   * 初始化环的基础变换矩阵
   */
  initializeRingTransforms() {
    Object.entries(V6_RINGS_CONFIG).forEach(([ringId, config]) => {
      const transform = {
        // 基础位置（来自v6模型的静态位置）
        basePosition: new THREE.Vector3(...config.position),
        baseRotation: Array.isArray(config.rotation) 
          ? new THREE.Euler(...config.rotation)
          : new THREE.Euler(0, 0, config.rotation),
        baseScale: Array.isArray(config.scale) 
          ? new THREE.Vector3(...config.scale)
          : new THREE.Vector3(config.scale, config.scale, config.scale),
        
        // 当前动画变换
        animatedPosition: new THREE.Vector3(),
        animatedRotation: new THREE.Euler(),
        animatedScale: new THREE.Vector3(1, 1, 1),
        
        // 最终变换（基础 + 动画）
        finalPosition: new THREE.Vector3(),
        finalRotation: new THREE.Euler(),
        finalScale: new THREE.Vector3(),
        finalMatrix: new THREE.Matrix4()
      }

      this.ringTransforms.set(ringId, transform)
    })
  }

  /**
   * 更新动画时间并计算变换
   */
  update(deltaTime) {
    if (!this.isInitialized || !this.isPlaying) {
      return
    }

    // 更新全局时间
    this.globalTime += deltaTime * this.playbackSpeed

    // 为每个环计算当前变换
    this.ringTransforms.forEach((transform, ringId) => {
      this.updateRingTransform(ringId, this.globalTime)
    })
  }

  /**
   * 更新特定环的变换
   */
  updateRingTransform(ringId, time) {
    const animationData = this.ringAnimations.get(ringId)
    const transform = this.ringTransforms.get(ringId)
    
    if (!animationData || !transform) {
      return
    }

    // 循环播放动画
    const normalizedTime = time % animationData.duration

    // 从动画数据中插值获取变换
    const animatedTransform = animationExtractor.interpolateTransformAtTime(
      animationData, 
      normalizedTime
    )

    // 更新动画变换
    transform.animatedPosition.set(
      animatedTransform.position.x,
      animatedTransform.position.y, 
      animatedTransform.position.z
    )

    if (animatedTransform.rotation.w !== undefined) {
      // 四元数旋转
      const quat = new THREE.Quaternion(
        animatedTransform.rotation.x,
        animatedTransform.rotation.y,
        animatedTransform.rotation.z,
        animatedTransform.rotation.w
      )
      transform.animatedRotation.setFromQuaternion(quat)
    } else {
      // 欧拉角旋转
      transform.animatedRotation.set(
        animatedTransform.rotation.x,
        animatedTransform.rotation.y,
        animatedTransform.rotation.z
      )
    }

    transform.animatedScale.set(
      animatedTransform.scale.x,
      animatedTransform.scale.y,
      animatedTransform.scale.z
    )

    // 合并基础变换和动画变换
    this.combineTransforms(transform)
  }

  /**
   * 合并基础变换和动画变换
   */
  combineTransforms(transform) {
    // 位置 = 基础位置 + 动画位置
    transform.finalPosition.copy(transform.basePosition).add(transform.animatedPosition)

    // 旋转 = 基础旋转 + 动画旋转
    const baseQuat = new THREE.Quaternion().setFromEuler(transform.baseRotation)
    const animQuat = new THREE.Quaternion().setFromEuler(transform.animatedRotation)
    const finalQuat = baseQuat.multiply(animQuat)
    transform.finalRotation.setFromQuaternion(finalQuat)

    // 缩放 = 基础缩放 * 动画缩放
    transform.finalScale.copy(transform.baseScale).multiply(transform.animatedScale)

    // 更新最终变换矩阵
    transform.finalMatrix.compose(
      transform.finalPosition,
      finalQuat,
      transform.finalScale
    )
  }

  /**
   * 获取指定环的当前变换矩阵
   */
  getRingTransformMatrix(ringId) {
    const transform = this.ringTransforms.get(ringId)
    return transform ? transform.finalMatrix.clone() : new THREE.Matrix4()
  }

  /**
   * 获取指定环的当前位置
   */
  getRingPosition(ringId) {
    const transform = this.ringTransforms.get(ringId)
    return transform ? transform.finalPosition.clone() : new THREE.Vector3()
  }

  /**
   * 获取指定环的当前旋转
   */
  getRingRotation(ringId) {
    const transform = this.ringTransforms.get(ringId)
    return transform ? transform.finalRotation.clone() : new THREE.Euler()
  }

  /**
   * 获取指定环的当前缩放
   */
  getRingScale(ringId) {
    const transform = this.ringTransforms.get(ringId)
    return transform ? transform.finalScale.clone() : new THREE.Vector3(1, 1, 1)
  }

  /**
   * 开始播放动画
   */
  play() {
    if (this.isInitialized) {
      this.isPlaying = true
      console.log('▶️ Animation playback started')
    }
  }

  /**
   * 暂停动画
   */
  pause() {
    this.isPlaying = false
    console.log('⏸️ Animation playback paused')
  }

  /**
   * 停止动画并重置时间
   */
  stop() {
    this.isPlaying = false
    this.globalTime = 0
    console.log('⏹️ Animation playback stopped')
  }

  /**
   * 设置播放速度
   */
  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(5.0, speed))
    console.log(`⚡ Playback speed set to ${this.playbackSpeed}x`)
  }

  /**
   * 跳转到指定时间
   */
  seekTo(time) {
    this.globalTime = Math.max(0, time)
    console.log(`⏭️ Seeked to ${time.toFixed(2)}s`)
  }

  /**
   * 获取动画的总时长
   */
  getTotalDuration() {
    let maxDuration = 0
    this.ringAnimations.forEach(animData => {
      maxDuration = Math.max(maxDuration, animData.duration)
    })
    return maxDuration
  }

  /**
   * 获取当前播放时间
   */
  getCurrentTime() {
    return this.globalTime
  }

  /**
   * 获取播放进度（0-1）
   */
  getProgress() {
    const totalDuration = this.getTotalDuration()
    return totalDuration > 0 ? (this.globalTime % totalDuration) / totalDuration : 0
  }

  /**
   * 生成指定环在指定时间的变换信息（用于预计算）
   */
  generateTransformAtTime(ringId, time) {
    const animationData = this.ringAnimations.get(ringId)
    const baseConfig = getRingConfig(ringId)
    
    if (!animationData || !baseConfig) {
      return null
    }

    const normalizedTime = time % animationData.duration
    const animatedTransform = animationExtractor.interpolateTransformAtTime(
      animationData,
      normalizedTime
    )

    // 计算最终变换
    const basePosition = new THREE.Vector3(...baseConfig.position)
    const animatedPosition = new THREE.Vector3(
      animatedTransform.position.x,
      animatedTransform.position.y,
      animatedTransform.position.z
    )
    
    const finalPosition = basePosition.add(animatedPosition)

    return {
      time: normalizedTime,
      position: finalPosition,
      rotation: animatedTransform.rotation,
      scale: animatedTransform.scale
    }
  }

  /**
   * 输出当前状态信息
   */
  logStatus() {
    console.group('🎭 Animation Mapping System Status')
    console.log(`Initialized: ${this.isInitialized}`)
    console.log(`Playing: ${this.isPlaying}`)
    console.log(`Current Time: ${this.globalTime.toFixed(2)}s`)
    console.log(`Total Duration: ${this.getTotalDuration().toFixed(2)}s`)
    console.log(`Progress: ${(this.getProgress() * 100).toFixed(1)}%`)
    console.log(`Playback Speed: ${this.playbackSpeed}x`)
    
    console.group('Ring Transforms')
    this.ringTransforms.forEach((transform, ringId) => {
      const pos = transform.finalPosition
      console.log(`${ringId}: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]`)
    })
    console.groupEnd()
    
    console.groupEnd()
  }
}

/**
 * 全局动画映射系统实例
 */
export const animationMappingSystem = new AnimationMappingSystem()

/**
 * React hook for using the animation mapping system
 */
export function useAnimationMapping() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await animationMappingSystem.initialize()
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize animation mapping system:', error)
      }
    }

    initializeSystem()
  }, [])

  // 动画循环
  useEffect(() => {
    if (!isInitialized) return

    let animationId
    const animate = () => {
      const deltaTime = 0.016 // 假设60fps
      animationMappingSystem.update(deltaTime)
      setCurrentTime(animationMappingSystem.getCurrentTime())
      setIsPlaying(animationMappingSystem.isPlaying)
      
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [isInitialized])

  return {
    isInitialized,
    isPlaying,
    currentTime,
    totalDuration: animationMappingSystem.getTotalDuration(),
    progress: animationMappingSystem.getProgress(),
    
    // 控制函数
    play: () => animationMappingSystem.play(),
    pause: () => animationMappingSystem.pause(),
    stop: () => animationMappingSystem.stop(),
    seekTo: (time) => animationMappingSystem.seekTo(time),
    setSpeed: (speed) => animationMappingSystem.setPlaybackSpeed(speed),
    
    // 数据获取函数
    getRingPosition: (ringId) => animationMappingSystem.getRingPosition(ringId),
    getRingRotation: (ringId) => animationMappingSystem.getRingRotation(ringId),
    getRingMatrix: (ringId) => animationMappingSystem.getRingTransformMatrix(ringId)
  }
}