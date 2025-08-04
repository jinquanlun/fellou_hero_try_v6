import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

/**
 * 多源动画提取器
 * 从Camera.glb和Scenes B系列模型中提取完整的动画数据
 */
export class MultiSourceAnimationExtractor {
  constructor() {
    this.isInitialized = false
    this.animationData = {
      v6Original: null,  // v6模型的原始动画
      camera: null,
      rings: {
        ring1: null, // Scenes_B_00100
        ring2: null, // Scenes_B_0023
        ring3: null  // Scenes_B_00100001
      }
    }
    this.totalDuration = 0
    this.phaseDurations = {
      phase1: 0,  // v6原始动画
      phase2: 2,  // 相机过渡时间
      phase3: 0   // 多源动画系统
    }
    this.loader = new GLTFLoader()
    
    // 设置DRACO解码器
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    this.loader.setDRACOLoader(dracoLoader)
  }

  /**
   * 初始化并提取所有动画数据（三阶段版本）
   */
  async initialize() {
    try {
      console.log('🎬 Initializing Three-Phase Animation Extractor...')
      
      // 并行提取所有动画数据
      const [v6OriginalData, cameraData, ring1Data, ring2Data, ring3Data] = await Promise.all([
        this.extractV6OriginalAnimation(),
        this.extractCameraAnimation(),
        this.extractRingAnimation('ring1', '/Scenes_B_00100-transformed.glb', 'Scenes_B_00100'),
        this.extractRingAnimation('ring2', '/Scenes_B_0023-transformed.glb', 'Scenes_B_0023'),
        this.extractRingAnimation('ring3', '/Scenes_B_00100.001-transformed.glb', 'Scenes_B_00100001')
      ])

      this.animationData.v6Original = v6OriginalData
      this.animationData.camera = cameraData
      this.animationData.rings.ring1 = ring1Data
      this.animationData.rings.ring2 = ring2Data
      this.animationData.rings.ring3 = ring3Data

      // 计算三阶段时长
      this.calculateThreePhaseDuration()
      
      this.isInitialized = true
      this.logExtractionSummary()
      
      return this.animationData
      
    } catch (error) {
      console.error('❌ Failed to initialize Three-Phase Animation Extractor:', error)
      throw error
    }
  }

  /**
   * 加载GLB文件
   */
  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject)
    })
  }

  /**
   * 提取v6模型原始动画数据
   */
  async extractV6OriginalAnimation() {
    console.log('🎯 Extracting v6 original animation...')
    
    try {
      const gltf = await this.loadGLTF('/LOST_cut2_v6-transformed.glb')
      const { animations, scene } = gltf
      
      console.log(`📊 v6 model: ${animations.length} animations, scene children:`, scene.children.length)

      if (animations.length === 0) {
        console.warn('⚠️ No v6 original animations found in LOST_cut2_v6-transformed.glb')
        console.warn('   This will cause Phase 1 duration to be 0, leading to incorrect phase calculation')
        return null
      }

      const v6Animation = {
        rings: {
          ring1: { position: null, rotation: null, scale: null },
          ring2: { position: null, rotation: null, scale: null },
          ring3: { position: null, rotation: null, scale: null }
        },
        duration: 0,
        metadata: {
          animationCount: animations.length,
          tracks: []
        }
      }

      // 处理所有动画
      animations.forEach((animation, index) => {
        console.log(`🎭 Processing v6 animation ${index}: "${animation.name}" (${animation.duration}s)`)
        
        v6Animation.duration = Math.max(v6Animation.duration, animation.duration)

        animation.tracks.forEach(track => {
          const trackName = track.name
          const parts = trackName.split('.')
          const objectName = parts[0]
          const propertyName = parts[1]

          console.log(`  📍 v6 track: ${trackName}`)
          v6Animation.metadata.tracks.push(trackName)

          // 映射v6对象到环
          if (objectName.includes('網格003')) {
            // Ring 1
            if (propertyName === 'position') {
              v6Animation.rings.ring1.position = this.processTrack(track, 'position')
            } else if (propertyName === 'rotation' || propertyName === 'quaternion') {
              v6Animation.rings.ring1.rotation = this.processTrack(track, propertyName)
            } else if (propertyName === 'scale') {
              v6Animation.rings.ring1.scale = this.processTrack(track, 'scale')
            }
          } else if (objectName.includes('網格002')) {
            // Ring 2
            if (propertyName === 'position') {
              v6Animation.rings.ring2.position = this.processTrack(track, 'position')
            } else if (propertyName === 'rotation' || propertyName === 'quaternion') {
              v6Animation.rings.ring2.rotation = this.processTrack(track, propertyName)
            } else if (propertyName === 'scale') {
              v6Animation.rings.ring2.scale = this.processTrack(track, 'scale')
            }
          } else if (objectName.includes('網格001')) {
            // Ring 3
            if (propertyName === 'position') {
              v6Animation.rings.ring3.position = this.processTrack(track, 'position')
            } else if (propertyName === 'rotation' || propertyName === 'quaternion') {
              v6Animation.rings.ring3.rotation = this.processTrack(track, propertyName)
            } else if (propertyName === 'scale') {
              v6Animation.rings.ring3.scale = this.processTrack(track, 'scale')
            }
          }
        })
      })

      return v6Animation

    } catch (error) {
      console.error('❌ Failed to extract v6 original animation:', error)
      return null
    }
  }

  /**
   * 提取相机动画数据
   */
  async extractCameraAnimation() {
    console.log('📹 Extracting camera animation from Camera.glb...')
    
    try {
      const gltf = await this.loadGLTF('/Camera-transformed.glb')
      const { animations, scene } = gltf
      
      console.log(`📊 Camera model: ${animations.length} animations, scene children:`, scene.children.length)

      if (animations.length === 0) {
        console.warn('⚠️ No camera animations found')
        return null
      }

      const cameraAnimation = {
        position: null,
        rotation: null,
        fov: null,
        duration: 0,
        metadata: {
          animationCount: animations.length,
          tracks: []
        }
      }

      // 处理所有动画
      animations.forEach((animation, index) => {
        console.log(`🎭 Processing camera animation ${index}: "${animation.name}" (${animation.duration}s)`)
        
        cameraAnimation.duration = Math.max(cameraAnimation.duration, animation.duration)

        animation.tracks.forEach(track => {
          const trackName = track.name
          const parts = trackName.split('.')
          const objectName = parts[0]
          const propertyName = parts[1]

          console.log(`  📍 Camera track: ${trackName}`)
          cameraAnimation.metadata.tracks.push(trackName)

          if (objectName === 'Camera') {
            switch (propertyName) {
              case 'position':
                cameraAnimation.position = this.processTrack(track, 'position')
                console.log(`    ✅ Extracted camera position (${track.times.length} keyframes)`)
                break
              case 'rotation':
                cameraAnimation.rotation = this.processTrack(track, 'rotation')
                console.log(`    ✅ Extracted camera rotation (${track.times.length} keyframes)`)
                break
              case 'quaternion':
                cameraAnimation.rotation = this.processTrack(track, 'quaternion')
                console.log(`    ✅ Extracted camera quaternion (${track.times.length} keyframes)`)
                break
              case 'fov':
                cameraAnimation.fov = this.processTrack(track, 'fov')
                console.log(`    ✅ Extracted camera FOV (${track.times.length} keyframes)`)
                break
            }
          }
        })
      })

      return cameraAnimation

    } catch (error) {
      console.error('❌ Failed to extract camera animation:', error)
      return null
    }
  }

  /**
   * 提取环动画数据
   */
  async extractRingAnimation(ringId, modelPath, objectName) {
    console.log(`🎯 Extracting ${ringId} animation from ${modelPath}...`)
    
    try {
      const gltf = await this.loadGLTF(modelPath)
      const { animations, scene } = gltf
      
      console.log(`📊 ${ringId} model: ${animations.length} animations, scene children:`, scene.children.length)

      if (animations.length === 0) {
        console.warn(`⚠️ No animations found for ${ringId}`)
        return null
      }

      const ringAnimation = {
        position: null,
        rotation: null,
        scale: null,
        duration: 0,
        metadata: {
          objectName,
          modelPath,
          animationCount: animations.length,
          tracks: []
        }
      }

      // 处理所有动画
      animations.forEach((animation, index) => {
        console.log(`🎭 Processing ${ringId} animation ${index}: "${animation.name}" (${animation.duration}s)`)
        
        ringAnimation.duration = Math.max(ringAnimation.duration, animation.duration)

        animation.tracks.forEach(track => {
          const trackName = track.name
          const parts = trackName.split('.')
          const trackObjectName = parts[0]
          const propertyName = parts[1]

          if (trackObjectName === objectName) {
            console.log(`  📍 ${ringId} track: ${trackName}`)
            ringAnimation.metadata.tracks.push(trackName)

            switch (propertyName) {
              case 'position':
                ringAnimation.position = this.processTrack(track, 'position')
                console.log(`    ✅ Extracted ${ringId} position (${track.times.length} keyframes)`)
                break
              case 'rotation':
                ringAnimation.rotation = this.processTrack(track, 'rotation')
                console.log(`    ✅ Extracted ${ringId} rotation (${track.times.length} keyframes)`)
                break
              case 'quaternion':
                ringAnimation.rotation = this.processTrack(track, 'quaternion')
                console.log(`    ✅ Extracted ${ringId} quaternion (${track.times.length} keyframes)`)
                break
              case 'scale':
                ringAnimation.scale = this.processTrack(track, 'scale')
                console.log(`    ✅ Extracted ${ringId} scale (${track.times.length} keyframes)`)
                break
            }
          }
        })
      })

      return ringAnimation

    } catch (error) {
      console.error(`❌ Failed to extract ${ringId} animation:`, error)
      return null
    }
  }

  /**
   * 处理动画轨道数据
   */
  processTrack(track, propertyType) {
    const processedTrack = {
      times: Array.from(track.times),
      values: Array.from(track.values),
      keyframes: [],
      interpolation: track.getInterpolation ? track.getInterpolation() : 'LINEAR',
      type: propertyType
    }

    // 根据属性类型处理数据
    switch (propertyType) {
      case 'position':
      case 'scale':
        for (let i = 0; i < track.values.length; i += 3) {
          processedTrack.keyframes.push({
            x: track.values[i],
            y: track.values[i + 1],
            z: track.values[i + 2]
          })
        }
        break

      case 'rotation':
        for (let i = 0; i < track.values.length; i += 3) {
          processedTrack.keyframes.push({
            x: track.values[i],
            y: track.values[i + 1],
            z: track.values[i + 2]
          })
        }
        break

      case 'quaternion':
        processedTrack.type = 'quaternion'
        for (let i = 0; i < track.values.length; i += 4) {
          processedTrack.keyframes.push({
            x: track.values[i],
            y: track.values[i + 1],
            z: track.values[i + 2],
            w: track.values[i + 3]
          })
        }
        break

      case 'fov':
        for (let i = 0; i < track.values.length; i++) {
          processedTrack.keyframes.push({
            value: track.values[i]
          })
        }
        break
    }

    return processedTrack
  }

  /**
   * 计算三阶段动画时长
   */
  calculateThreePhaseDuration() {
    // Phase 1: v6原始动画
    if (this.animationData.v6Original && this.animationData.v6Original.duration > 0) {
      this.phaseDurations.phase1 = this.animationData.v6Original.duration
      console.log(`✅ Phase 1 duration from v6Original: ${this.phaseDurations.phase1}s`)
    } else {
      // 如果v6Original没有加载或时长为0，设置一个默认的Phase 1时长
      this.phaseDurations.phase1 = 7.0
      console.warn('⚠️ v6Original not loaded or duration is 0, using default Phase 1 duration: 7.0s')
    }

    // Phase 2: 相机过渡（固定2秒）
    this.phaseDurations.phase2 = 2.0

    // Phase 3: 多源动画系统
    let phase3Duration = 0
    if (this.animationData.camera) {
      phase3Duration = Math.max(phase3Duration, this.animationData.camera.duration)
    }
    Object.values(this.animationData.rings).forEach(ringData => {
      if (ringData) {
        phase3Duration = Math.max(phase3Duration, ringData.duration)
      }
    })
    this.phaseDurations.phase3 = phase3Duration

    // 总时长
    this.totalDuration = this.phaseDurations.phase1 + this.phaseDurations.phase2 + this.phaseDurations.phase3

    console.log(`⏱️ Three-Phase Animation Duration:`)
    console.log(`  Phase 1 (v6 Original): ${this.phaseDurations.phase1.toFixed(2)}s`)
    console.log(`  Phase 2 (Camera Transition): ${this.phaseDurations.phase2.toFixed(2)}s`)
    console.log(`  Phase 3 (Multi-Source): ${this.phaseDurations.phase3.toFixed(2)}s`)
    console.log(`  Total Duration: ${this.totalDuration.toFixed(2)}s`)
  }

  /**
   * 获取当前时间对应的动画阶段
   */
  getCurrentPhase(time) {
    
    if (time <= this.phaseDurations.phase1) {
      return {
        phase: 1,
        phaseTime: time,
        progress: time / this.phaseDurations.phase1
      }
    } else if (time <= this.phaseDurations.phase1 + this.phaseDurations.phase2) {
      const phaseStartTime = this.phaseDurations.phase1
      const phaseTime = time - phaseStartTime
      return {
        phase: 2,
        phaseTime: phaseTime,
        progress: phaseTime / this.phaseDurations.phase2
      }
    } else {
      const phaseStartTime = this.phaseDurations.phase1 + this.phaseDurations.phase2
      const phaseTime = time - phaseStartTime
      return {
        phase: 3,
        phaseTime: phaseTime,
        progress: phaseTime / this.phaseDurations.phase3
      }
    }
  }

  /**
   * 获取v6原始动画在指定时间的环变换
   */
  getV6OriginalRingTransformAtTime(ringId, time) {
    if (!this.animationData.v6Original) return null

    const ringMap = {
      'ring1': 'ring1',
      'ring2': 'ring2', 
      'ring3': 'ring3'
    }

    const ringData = this.animationData.v6Original.rings[ringMap[ringId]]
    if (!ringData) return null

    const normalizedTime = time % this.animationData.v6Original.duration

    const result = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    }

    if (ringData.position) {
      result.position = this.interpolateProperty(ringData.position, normalizedTime, 3)
    }

    if (ringData.rotation) {
      const componentCount = ringData.rotation.type === 'quaternion' ? 4 : 3
      result.rotation = this.interpolateProperty(ringData.rotation, normalizedTime, componentCount)
    }

    if (ringData.scale) {
      result.scale = this.interpolateProperty(ringData.scale, normalizedTime, 3)
    }

    return result
  }

  /**
   * 计算从一个位置看向另一个位置的旋转角度
   */
  calculateLookAtRotation(fromPosition, toPosition) {
    const from = new THREE.Vector3(fromPosition.x, fromPosition.y, fromPosition.z)
    const to = new THREE.Vector3(toPosition.x, toPosition.y, toPosition.z)
    
    // 计算方向向量
    const direction = to.clone().sub(from).normalize()
    
    // 创建lookAt矩阵
    const matrix = new THREE.Matrix4()
    const up = new THREE.Vector3(0, 1, 0)
    matrix.lookAt(from, to, up)
    
    // 从矩阵提取旋转
    const euler = new THREE.Euler()
    euler.setFromRotationMatrix(matrix)
    
    return { x: euler.x, y: euler.y, z: euler.z }
  }

  /**
   * 在指定时间获取相机变换（三阶段版本）
   */
  getCameraTransformAtTime(time) {
    const currentPhase = this.getCurrentPhase(time)
    
    // 定义静态相机位置（用于Phase 1）- 使用用户保存的理想视角
    const staticCameraParams = {
      position: { x: -18.43, y: 14.48, z: 16.30 },  // 用户定义的理想位置
      rotation: this.calculateLookAtRotation(
        { x: -18.43, y: 14.48, z: 16.30 },  // 相机位置
        { x: -1.40, y: 15.30, z: -1.33 }    // 用户保存的原始目标位置
      ),
      fov: 35.0  // 用户保存的原始FOV
    }

    // 默认相机参数（Camera.glb的起始位置）
    const defaultCameraParams = {
      position: { x: 13.037, y: 2.624, z: 23.379 },
      rotation: { x: 0.318, y: 0.562, z: -0.051 },
      fov: 25.361
    }

    switch (currentPhase.phase) {
      case 1:
        // Phase 1: 静态相机
        return staticCameraParams

      case 2:
        // Phase 2: 相机过渡（从用户自定义位置到Camera.glb起始位置）
        const progress = currentPhase.progress
        const easeInOutCubic = (t) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        const smoothProgress = easeInOutCubic(progress)

        // 计算从用户位置看向目标的旋转角度
        const userTargetVector = new THREE.Vector3(-1.40, 15.30, -1.33)
        const userPositionVector = new THREE.Vector3(-18.43, 14.48, 16.30)
        const lookDirection = userTargetVector.clone().sub(userPositionVector).normalize()
        
        // 计算用户视角的欧拉角
        const userEuler = new THREE.Euler()
        userEuler.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1), 
          lookDirection
        ))

        return {
          position: {
            x: staticCameraParams.position.x + (defaultCameraParams.position.x - staticCameraParams.position.x) * smoothProgress,
            y: staticCameraParams.position.y + (defaultCameraParams.position.y - staticCameraParams.position.y) * smoothProgress,
            z: staticCameraParams.position.z + (defaultCameraParams.position.z - staticCameraParams.position.z) * smoothProgress
          },
          rotation: {
            x: userEuler.x + (defaultCameraParams.rotation.x - userEuler.x) * smoothProgress,
            y: userEuler.y + (defaultCameraParams.rotation.y - userEuler.y) * smoothProgress,
            z: userEuler.z + (defaultCameraParams.rotation.z - userEuler.z) * smoothProgress
          },
          fov: staticCameraParams.fov + (defaultCameraParams.fov - staticCameraParams.fov) * smoothProgress
        }

      case 3:
        // Phase 3: Camera.glb动画
        if (!this.animationData.camera) return defaultCameraParams

        const normalizedTime = currentPhase.phaseTime % this.animationData.camera.duration
        const result = { ...defaultCameraParams }

        if (this.animationData.camera.position) {
          result.position = this.interpolateProperty(this.animationData.camera.position, normalizedTime, 3)
        }

        if (this.animationData.camera.rotation) {
          const componentCount = this.animationData.camera.rotation.type === 'quaternion' ? 4 : 3
          result.rotation = this.interpolateProperty(this.animationData.camera.rotation, normalizedTime, componentCount)
        }

        if (this.animationData.camera.fov) {
          result.fov = this.interpolateProperty(this.animationData.camera.fov, normalizedTime, 1).value || 25.361
        }

        return result

      default:
        return defaultCameraParams
    }
  }

  /**
   * 在指定时间获取环变换（三阶段版本）
   */
  getRingTransformAtTime(ringId, time) {
    const currentPhase = this.getCurrentPhase(time)

    switch (currentPhase.phase) {
      case 1:
        // Phase 1: 使用v6原始动画
        return this.getV6OriginalRingTransformAtTime(ringId, currentPhase.phaseTime)

      case 2:
        // Phase 2: 相机过渡期间，环保持v6动画的最后状态
        const v6Duration = this.animationData.v6Original?.duration || 0
        return this.getV6OriginalRingTransformAtTime(ringId, v6Duration)

      case 3:
        // Phase 3: 使用Scenes B动画数据
        const ringData = this.animationData.rings[ringId]
        if (!ringData) return null

        const normalizedTime = currentPhase.phaseTime % ringData.duration
        const result = {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        }

        if (ringData.position) {
          result.position = this.interpolateProperty(ringData.position, normalizedTime, 3)
        }

        if (ringData.rotation) {
          const componentCount = ringData.rotation.type === 'quaternion' ? 4 : 3
          result.rotation = this.interpolateProperty(ringData.rotation, normalizedTime, componentCount)
        }

        if (ringData.scale) {
          result.scale = this.interpolateProperty(ringData.scale, normalizedTime, 3)
        }

        return result

      default:
        return {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        }
    }
  }

  /**
   * 属性插值计算
   */
  interpolateProperty(track, time, componentCount) {
    const { times, values } = track
    
    if (times.length === 0) {
      if (componentCount === 4) return { x: 0, y: 0, z: 0, w: 1 }
      if (componentCount === 1) return { value: 0 }
      return { x: 0, y: 0, z: 0 }
    }

    // 查找时间区间
    let index = 0
    for (let i = 0; i < times.length - 1; i++) {
      if (time >= times[i] && time <= times[i + 1]) {
        index = i
        break
      }
    }

    // 边界处理
    if (time <= times[0]) index = 0
    if (time >= times[times.length - 1]) index = times.length - 1

    // 如果在最后一个关键帧
    if (index === times.length - 1 || times.length === 1) {
      const startIndex = index * componentCount
      if (componentCount === 4) {
        return {
          x: values[startIndex],
          y: values[startIndex + 1],
          z: values[startIndex + 2],
          w: values[startIndex + 3]
        }
      } else if (componentCount === 1) {
        return { value: values[startIndex] }
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
      // 四元数插值
      const q1 = new THREE.Quaternion(
        values[startIndex], values[startIndex + 1], 
        values[startIndex + 2], values[startIndex + 3]
      )
      const q2 = new THREE.Quaternion(
        values[endIndex], values[endIndex + 1],
        values[endIndex + 2], values[endIndex + 3]
      )
      
      const result = new THREE.Quaternion().slerpQuaternions(q1, q2, factor)
      return { x: result.x, y: result.y, z: result.z, w: result.w }
    } else if (componentCount === 1) {
      return {
        value: values[startIndex] + (values[endIndex] - values[startIndex]) * factor
      }
    } else {
      return {
        x: values[startIndex] + (values[endIndex] - values[startIndex]) * factor,
        y: values[startIndex + 1] + (values[endIndex + 1] - values[startIndex + 1]) * factor,
        z: values[startIndex + 2] + (values[endIndex + 2] - values[startIndex + 2]) * factor
      }
    }
  }

  /**
   * 获取所有变换数据（三阶段版本）
   */
  getAllTransformsAtTime(time) {
    const currentPhase = this.getCurrentPhase(time)
    
    return {
      phase: currentPhase,
      camera: this.getCameraTransformAtTime(time),
      rings: {
        ring1: this.getRingTransformAtTime('ring1', time),
        ring2: this.getRingTransformAtTime('ring2', time),
        ring3: this.getRingTransformAtTime('ring3', time)
      }
    }
  }

  /**
   * 获取阶段持续时间信息
   */
  getPhaseDurations() {
    return { ...this.phaseDurations }
  }

  /**
   * 输出提取摘要（三阶段版本）
   */
  logExtractionSummary() {
    console.group('📊 Three-Phase Animation Extraction Summary')
    
    // v6原始动画摘要
    if (this.animationData.v6Original) {
      console.log('🎯 v6 Original Animation:')
      console.log(`  ⏱️ Duration: ${this.animationData.v6Original.duration.toFixed(2)}s`)
      console.log(`  📋 Tracks: ${this.animationData.v6Original.metadata.tracks.length}`)
      console.log(`  🎨 Ring 1: ${this.animationData.v6Original.rings.ring1.position ? '✅' : '❌'}`)
      console.log(`  🎨 Ring 2: ${this.animationData.v6Original.rings.ring2.position ? '✅' : '❌'}`)
      console.log(`  🎨 Ring 3: ${this.animationData.v6Original.rings.ring3.position ? '✅' : '❌'}`)
    } else {
      console.log('🎯 v6 Original Animation: ❌ Not available')
    }
    
    // 相机动画摘要
    if (this.animationData.camera) {
      console.log('\n📹 Camera Animation:')
      console.log(`  ⏱️ Duration: ${this.animationData.camera.duration.toFixed(2)}s`)
      console.log(`  📍 Position: ${this.animationData.camera.position ? '✅' : '❌'}`)
      console.log(`  🔄 Rotation: ${this.animationData.camera.rotation ? '✅' : '❌'}`)
      console.log(`  🔍 FOV: ${this.animationData.camera.fov ? '✅' : '❌'}`)
      console.log(`  📋 Tracks: ${this.animationData.camera.metadata.tracks.length}`)
    } else {
      console.log('\n📹 Camera Animation: ❌ Not available')
    }

    // Scenes B环动画摘要
    console.log('\n🎯 Scenes B Ring Animations:')
    Object.entries(this.animationData.rings).forEach(([ringId, data]) => {
      if (data) {
        console.log(`  ${ringId} (${data.metadata.objectName}):`)
        console.log(`    ⏱️ Duration: ${data.duration.toFixed(2)}s`)
        console.log(`    📍 Position: ${data.position ? '✅' : '❌'}`)
        console.log(`    🔄 Rotation: ${data.rotation ? '✅' : '❌'}`)
        console.log(`    📏 Scale: ${data.scale ? '✅' : '❌'}`)
        console.log(`    📋 Tracks: ${data.metadata.tracks.length}`)
      } else {
        console.log(`  ${ringId}: ❌ Not available`)
      }
    })

    console.log(`\n🕐 Phase Durations:`)
    console.log(`  Phase 1 (v6 Original): ${this.phaseDurations.phase1.toFixed(2)}s`)
    console.log(`  Phase 2 (Camera Transition): ${this.phaseDurations.phase2.toFixed(2)}s`)
    console.log(`  Phase 3 (Multi-Source): ${this.phaseDurations.phase3.toFixed(2)}s`)
    console.log(`🕐 Total Duration: ${this.totalDuration.toFixed(2)}s`)
    console.log(`🎬 System Status: ${this.isInitialized ? '✅ Ready' : '❌ Not Ready'}`)
    
    console.groupEnd()
  }

  /**
   * 获取动画持续时间
   */
  getDuration() {
    return this.totalDuration
  }

  /**
   * 检查是否准备就绪
   */
  isReady() {
    return this.isInitialized
  }
}

/**
 * 全局多源动画提取器实例
 */
export const multiSourceAnimationExtractor = new MultiSourceAnimationExtractor()