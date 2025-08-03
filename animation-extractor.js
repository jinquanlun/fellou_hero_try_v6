import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { 
  getAnimationMapping, 
  getSourceConfig, 
  getRingConfig 
} from './ring-mapping-config.js'

/**
 * 动画数据提取器
 * 从Scenes B模型中提取动画轨道数据
 */
export class AnimationExtractor {
  constructor() {
    this.extractedAnimations = new Map()
    this.animationCache = new Map()
  }

  /**
   * 提取指定环的动画数据
   */
  async extractRingAnimation(ringId) {
    const mapping = getAnimationMapping(ringId)
    if (!mapping) {
      throw new Error(`No mapping found for ring: ${ringId}`)
    }

    const sourceConfig = getSourceConfig(mapping.source)
    if (!sourceConfig) {
      throw new Error(`No source config found: ${mapping.source}`)
    }

    // 检查缓存
    const cacheKey = `${mapping.source}_${mapping.sourceObject}`
    if (this.animationCache.has(cacheKey)) {
      return this.animationCache.get(cacheKey)
    }

    try {
      // 加载GLTF模型
      const { animations } = useGLTF(sourceConfig.modelPath)
      
      // 提取目标对象的动画轨道
      const extractedData = this.extractObjectAnimationTracks(
        animations, 
        mapping.sourceObject,
        mapping.transformations
      )

      // 缓存结果
      this.animationCache.set(cacheKey, extractedData)
      
      return extractedData
    } catch (error) {
      console.error(`Failed to extract animation for ${ringId}:`, error)
      throw error
    }
  }

  /**
   * 从动画数组中提取特定对象的轨道数据
   */
  extractObjectAnimationTracks(animations, objectName, transformations = {}) {
    const extractedTracks = {
      position: null,
      rotation: null,
      scale: null,
      duration: 0,
      metadata: {
        objectName,
        trackCount: 0,
        transformations
      }
    }

    animations.forEach(animation => {
      if (animation.duration > extractedTracks.duration) {
        extractedTracks.duration = animation.duration
      }

      animation.tracks.forEach(track => {
        const trackName = track.name
        const targetObjectName = trackName.split('.')[0]
        const propertyName = trackName.split('.')[1]

        // 检查是否是目标对象的轨道
        if (targetObjectName === objectName) {
          extractedTracks.metadata.trackCount++

          switch (propertyName) {
            case 'position':
              extractedTracks.position = this.processPositionTrack(track, transformations)
              break
            case 'rotation':
              extractedTracks.rotation = this.processRotationTrack(track, transformations)
              break
            case 'scale':
              extractedTracks.scale = this.processScaleTrack(track, transformations)
              break
            case 'quaternion':
              extractedTracks.rotation = this.processQuaternionTrack(track, transformations)
              break
          }
        }
      })
    })

    return extractedTracks
  }

  /**
   * 处理位置轨道数据
   */
  processPositionTrack(track, transformations) {
    const { positionScale = 1.0 } = transformations
    
    const processedTrack = {
      times: Array.from(track.times),
      values: [],
      keyframes: []
    }

    // 处理位置值（每3个值为一组：x, y, z）
    for (let i = 0; i < track.values.length; i += 3) {
      const x = track.values[i] * positionScale
      const y = track.values[i + 1] * positionScale  
      const z = track.values[i + 2] * positionScale

      processedTrack.values.push(x, y, z)
      processedTrack.keyframes.push({ x, y, z })
    }

    return processedTrack
  }

  /**
   * 处理旋转轨道数据（欧拉角）
   */
  processRotationTrack(track, transformations) {
    const { rotationOffset = [0, 0, 0] } = transformations
    
    const processedTrack = {
      times: Array.from(track.times),
      values: [],
      keyframes: []
    }

    // 处理旋转值（每3个值为一组：x, y, z）
    for (let i = 0; i < track.values.length; i += 3) {
      const x = track.values[i] + rotationOffset[0]
      const y = track.values[i + 1] + rotationOffset[1]
      const z = track.values[i + 2] + rotationOffset[2]

      processedTrack.values.push(x, y, z)
      processedTrack.keyframes.push({ x, y, z })
    }

    return processedTrack
  }

  /**
   * 处理四元数旋转轨道数据
   */
  processQuaternionTrack(track, transformations) {
    const { rotationOffset = [0, 0, 0] } = transformations
    
    const processedTrack = {
      times: Array.from(track.times),
      values: [],
      keyframes: [],
      type: 'quaternion'
    }

    // 处理四元数值（每4个值为一组：x, y, z, w）
    for (let i = 0; i < track.values.length; i += 4) {
      const quat = new THREE.Quaternion(
        track.values[i],
        track.values[i + 1], 
        track.values[i + 2],
        track.values[i + 3]
      )

      // 应用旋转偏移
      if (rotationOffset[0] !== 0 || rotationOffset[1] !== 0 || rotationOffset[2] !== 0) {
        const offsetQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotationOffset[0], rotationOffset[1], rotationOffset[2])
        )
        quat.multiply(offsetQuat)
      }

      processedTrack.values.push(quat.x, quat.y, quat.z, quat.w)
      processedTrack.keyframes.push({ 
        x: quat.x, 
        y: quat.y, 
        z: quat.z, 
        w: quat.w 
      })
    }

    return processedTrack
  }

  /**
   * 处理缩放轨道数据
   */
  processScaleTrack(track, transformations) {
    const processedTrack = {
      times: Array.from(track.times),
      values: [],
      keyframes: []
    }

    // 处理缩放值（每3个值为一组：x, y, z）
    for (let i = 0; i < track.values.length; i += 3) {
      const x = track.values[i]
      const y = track.values[i + 1]
      const z = track.values[i + 2]

      processedTrack.values.push(x, y, z)
      processedTrack.keyframes.push({ x, y, z })
    }

    return processedTrack
  }

  /**
   * 在指定时间插值获取变换数据
   */
  interpolateTransformAtTime(extractedTracks, time) {
    const result = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    }

    // 确保时间在有效范围内
    time = Math.max(0, Math.min(time, extractedTracks.duration))

    // 插值位置
    if (extractedTracks.position) {
      result.position = this.interpolateProperty(
        extractedTracks.position, 
        time, 
        3 // 3个分量：x, y, z
      )
    }

    // 插值旋转
    if (extractedTracks.rotation) {
      const componentCount = extractedTracks.rotation.type === 'quaternion' ? 4 : 3
      result.rotation = this.interpolateProperty(
        extractedTracks.rotation,
        time,
        componentCount
      )
    }

    // 插值缩放
    if (extractedTracks.scale) {
      result.scale = this.interpolateProperty(
        extractedTracks.scale,
        time,
        3
      )
    }

    return result
  }

  /**
   * 插值计算属性值
   */
  interpolateProperty(track, time, componentCount) {
    const { times, values } = track
    
    if (times.length === 0) {
      return componentCount === 4 
        ? { x: 0, y: 0, z: 0, w: 1 } 
        : { x: 0, y: 0, z: 0 }
    }

    // 查找时间区间
    let index = 0
    for (let i = 0; i < times.length - 1; i++) {
      if (time >= times[i] && time <= times[i + 1]) {
        index = i
        break
      }
    }

    // 边界情况
    if (time <= times[0]) {
      index = 0
    } else if (time >= times[times.length - 1]) {
      index = times.length - 1
    }

    // 如果在最后一个关键帧或只有一个关键帧
    if (index === times.length - 1 || times.length === 1) {
      const startIndex = index * componentCount
      if (componentCount === 4) {
        return {
          x: values[startIndex],
          y: values[startIndex + 1], 
          z: values[startIndex + 2],
          w: values[startIndex + 3]
        }
      } else {
        return {
          x: values[startIndex],
          y: values[startIndex + 1],
          z: values[startIndex + 2]
        }
      }
    }

    // 线性插值
    const t1 = times[index]
    const t2 = times[index + 1]
    const factor = (time - t1) / (t2 - t1)

    const startIndex = index * componentCount
    const endIndex = (index + 1) * componentCount

    if (componentCount === 4) {
      // 四元数球面线性插值
      const q1 = new THREE.Quaternion(
        values[startIndex],
        values[startIndex + 1],
        values[startIndex + 2], 
        values[startIndex + 3]
      )
      const q2 = new THREE.Quaternion(
        values[endIndex],
        values[endIndex + 1],
        values[endIndex + 2],
        values[endIndex + 3]
      )
      
      const result = new THREE.Quaternion().slerpQuaternions(q1, q2, factor)
      return { x: result.x, y: result.y, z: result.z, w: result.w }
    } else {
      // 线性插值
      return {
        x: values[startIndex] + (values[endIndex] - values[startIndex]) * factor,
        y: values[startIndex + 1] + (values[endIndex + 1] - values[startIndex + 1]) * factor,
        z: values[startIndex + 2] + (values[endIndex + 2] - values[startIndex + 2]) * factor
      }
    }
  }

  /**
   * 获取动画的关键时间点
   */
  getKeyTimes(extractedTracks) {
    const allTimes = new Set()
    
    if (extractedTracks.position) {
      extractedTracks.position.times.forEach(t => allTimes.add(t))
    }
    if (extractedTracks.rotation) {
      extractedTracks.rotation.times.forEach(t => allTimes.add(t))
    }
    if (extractedTracks.scale) {
      extractedTracks.scale.times.forEach(t => allTimes.add(t))
    }

    return Array.from(allTimes).sort((a, b) => a - b)
  }

  /**
   * 生成均匀时间采样的动画数据
   */
  generateUniformSamples(extractedTracks, sampleRate = 60) {
    const samples = []
    const duration = extractedTracks.duration
    const timeStep = 1 / sampleRate
    
    for (let time = 0; time <= duration; time += timeStep) {
      const transform = this.interpolateTransformAtTime(extractedTracks, time)
      samples.push({
        time,
        ...transform
      })
    }

    return samples
  }
}

/**
 * 全局动画提取器实例
 */
export const animationExtractor = new AnimationExtractor()

/**
 * 便捷函数：提取所有环的动画数据
 */
export async function extractAllRingAnimations() {
  const ringIds = ['ring1', 'ring2', 'ring3']
  const results = {}

  for (const ringId of ringIds) {
    try {
      console.log(`🎬 Extracting animation for ${ringId}...`)
      results[ringId] = await animationExtractor.extractRingAnimation(ringId)
      console.log(`✅ Successfully extracted ${ringId} animation`)
    } catch (error) {
      console.error(`❌ Failed to extract ${ringId} animation:`, error)
      results[ringId] = null
    }
  }

  return results
}