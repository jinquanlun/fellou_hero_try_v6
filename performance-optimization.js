import * as THREE from 'three'

/**
 * 性能优化管理器
 * 提供粒子系统的性能监控和优化功能
 */
export class PerformanceOptimizer {
  constructor() {
    this.stats = {
      frameCount: 0,
      lastTime: 0,
      fps: 60,
      averageFps: 60,
      memoryUsage: 0,
      particleCount: 0,
      drawCalls: 0,
      renderTime: 0,
      updateTime: 0
    }
    
    this.fpsHistory = []
    this.maxHistoryLength = 60
    this.performanceMode = 'auto' // 'high', 'medium', 'low', 'auto'
    this.adaptiveSettings = {
      targetFps: 60,
      minFps: 30,
      maxParticles: 3000,
      minParticles: 500,
      currentQuality: 1.0
    }
    
    this.observers = []
    this.isMonitoring = false
  }

  /**
   * 开始性能监控
   */
  startMonitoring() {
    this.isMonitoring = true
    this.lastTime = performance.now()
    console.log('📊 Performance monitoring started')
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    this.isMonitoring = false
    console.log('📊 Performance monitoring stopped')
  }

  /**
   * 更新性能统计
   */
  updateStats(deltaTime, particleCount = 0) {
    if (!this.isMonitoring) return

    const now = performance.now()
    this.stats.frameCount++
    
    // 计算FPS
    if (now - this.lastTime >= 1000) {
      this.stats.fps = this.stats.frameCount
      this.fpsHistory.push(this.stats.fps)
      
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift()
      }
      
      this.stats.averageFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      this.stats.frameCount = 0
      this.lastTime = now
      
      // 更新内存使用情况
      if (performance.memory) {
        this.stats.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024
      }
    }
    
    this.stats.particleCount = particleCount
    
    // 自适应性能调整
    if (this.performanceMode === 'auto') {
      this.adaptivePerformanceAdjustment()
    }
    
    // 通知观察者
    this.notifyObservers()
  }

  /**
   * 自适应性能调整
   */
  adaptivePerformanceAdjustment() {
    const { fps, averageFps } = this.stats
    const { targetFps, minFps } = this.adaptiveSettings
    
    // 如果FPS低于目标，降低质量
    if (averageFps < targetFps * 0.9) {
      this.adaptiveSettings.currentQuality *= 0.95
      this.adaptiveSettings.currentQuality = Math.max(0.3, this.adaptiveSettings.currentQuality)
    }
    // 如果FPS稳定高于目标，提高质量
    else if (averageFps > targetFps * 1.1) {
      this.adaptiveSettings.currentQuality *= 1.02
      this.adaptiveSettings.currentQuality = Math.min(1.0, this.adaptiveSettings.currentQuality)
    }
    
    // 如果FPS过低，启用紧急优化
    if (fps < minFps) {
      this.emergencyOptimization()
    }
  }

  /**
   * 紧急优化（当FPS过低时）
   */
  emergencyOptimization() {
    console.warn('⚠️ Emergency optimization triggered due to low FPS')
    
    // 大幅降低粒子数量
    this.adaptiveSettings.currentQuality *= 0.7
    
    // 通知系统需要优化
    this.notifyObservers('emergency_optimization')
  }

  /**
   * 获取推荐的粒子数量
   */
  getRecommendedParticleCount(baseCount) {
    const quality = this.adaptiveSettings.currentQuality
    const recommended = Math.floor(baseCount * quality)
    
    return Math.max(
      this.adaptiveSettings.minParticles,
      Math.min(this.adaptiveSettings.maxParticles, recommended)
    )
  }

  /**
   * 获取推荐的更新频率
   */
  getRecommendedUpdateFrequency() {
    const quality = this.adaptiveSettings.currentQuality
    
    if (quality > 0.8) return 1 // 每帧更新
    if (quality > 0.5) return 2 // 每2帧更新
    return 3 // 每3帧更新
  }

  /**
   * 添加性能观察者
   */
  addObserver(callback) {
    this.observers.push(callback)
  }

  /**
   * 移除性能观察者
   */
  removeObserver(callback) {
    const index = this.observers.indexOf(callback)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  /**
   * 通知所有观察者
   */
  notifyObservers(event = 'stats_update') {
    this.observers.forEach(callback => {
      try {
        callback(this.stats, event)
      } catch (error) {
        console.error('Error in performance observer:', error)
      }
    })
  }

  /**
   * 设置性能模式
   */
  setPerformanceMode(mode) {
    this.performanceMode = mode
    
    switch (mode) {
      case 'high':
        this.adaptiveSettings.currentQuality = 1.0
        break
      case 'medium':
        this.adaptiveSettings.currentQuality = 0.7
        break
      case 'low':
        this.adaptiveSettings.currentQuality = 0.4
        break
      case 'auto':
        // 保持当前质量设置
        break
    }
    
    console.log(`🎮 Performance mode set to: ${mode}`)
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    return {
      ...this.stats,
      quality: this.adaptiveSettings.currentQuality,
      mode: this.performanceMode,
      recommendations: this.getRecommendations()
    }
  }

  /**
   * 获取性能建议
   */
  getRecommendations() {
    const recommendations = []
    
    if (this.stats.averageFps < 30) {
      recommendations.push('Consider reducing particle count')
      recommendations.push('Enable performance mode')
      recommendations.push('Reduce visual effects quality')
    }
    
    if (this.stats.memoryUsage > 200) {
      recommendations.push('High memory usage detected')
      recommendations.push('Consider clearing particle trails more frequently')
    }
    
    if (this.stats.particleCount > 5000) {
      recommendations.push('Very high particle count')
      recommendations.push('Consider using LOD (Level of Detail) system')
    }
    
    return recommendations
  }
}

/**
 * 粒子系统优化工具
 */
export class ParticleSystemOptimizer {
  static optimizeGeometry(geometry, particleCount) {
    // 使用更小的缓冲区大小
    const positions = geometry.attributes.position
    const colors = geometry.attributes.color
    
    if (positions && positions.array.length > particleCount * 3) {
      // 重新创建更小的缓冲区
      const newPositions = new Float32Array(particleCount * 3)
      const newColors = new Float32Array(particleCount * 3)
      
      geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3))
    }
    
    return geometry
  }

  static createLODSystem(particleSystems, camera) {
    const lodLevels = []
    
    Object.entries(particleSystems).forEach(([ringId, system]) => {
      if (!system || !system.getMesh) return
      
      const mesh = system.getMesh()
      const lod = new THREE.LOD()
      
      // 高细节级别（近距离）
      const highDetail = mesh.clone()
      lod.addLevel(highDetail, 0)
      
      // 中等细节级别
      const mediumDetail = mesh.clone()
      mediumDetail.material = mediumDetail.material.clone()
      mediumDetail.material.uniforms.glowIntensity.value *= 0.7
      lod.addLevel(mediumDetail, 50)
      
      // 低细节级别（远距离）
      const lowDetail = mesh.clone()
      lowDetail.material = lowDetail.material.clone()
      lowDetail.material.uniforms.glowIntensity.value *= 0.4
      lod.addLevel(lowDetail, 100)
      
      lodLevels.push({
        ringId,
        lod,
        originalMesh: mesh
      })
    })
    
    return lodLevels
  }

  static enableFrustumCulling(scene, camera) {
    const frustum = new THREE.Frustum()
    const matrix = new THREE.Matrix4()
    
    return {
      update: () => {
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        frustum.setFromProjectionMatrix(matrix)
        
        scene.traverse((object) => {
          if (object.isPoints || object.isLine) {
            object.visible = frustum.intersectsObject(object)
          }
        })
      }
    }
  }
}

/**
 * 内存管理器
 */
export class MemoryManager {
  constructor() {
    this.disposables = new Set()
    this.textureCache = new Map()
    this.geometryCache = new Map()
    this.materialCache = new Map()
  }

  /**
   * 注册可释放资源
   */
  register(resource) {
    this.disposables.add(resource)
  }

  /**
   * 创建或获取缓存的纹理
   */
  getTexture(key, createFunction) {
    if (!this.textureCache.has(key)) {
      const texture = createFunction()
      this.textureCache.set(key, texture)
      this.register(texture)
    }
    return this.textureCache.get(key)
  }

  /**
   * 创建或获取缓存的几何体
   */
  getGeometry(key, createFunction) {
    if (!this.geometryCache.has(key)) {
      const geometry = createFunction()
      this.geometryCache.set(key, geometry)
      this.register(geometry)
    }
    return this.geometryCache.get(key)
  }

  /**
   * 清理内存
   */
  cleanup() {
    console.log('🧹 Starting memory cleanup...')
    
    let disposed = 0
    this.disposables.forEach(resource => {
      if (resource && typeof resource.dispose === 'function') {
        resource.dispose()
        disposed++
      }
    })
    
    this.disposables.clear()
    this.textureCache.clear()
    this.geometryCache.clear()
    this.materialCache.clear()
    
    console.log(`🧹 Memory cleanup completed: ${disposed} resources disposed`)
    
    // 强制垃圾回收（如果可用）
    if (window.gc) {
      window.gc()
    }
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize / 1024 / 1024,
        total: performance.memory.totalJSHeapSize / 1024 / 1024,
        limit: performance.memory.jsHeapSizeLimit / 1024 / 1024
      }
    }
    return null
  }
}

/**
 * 性能测试套件
 */
export class PerformanceTestSuite {
  constructor() {
    this.tests = []
    this.results = []
  }

  /**
   * 添加测试用例
   */
  addTest(name, testFunction) {
    this.tests.push({ name, testFunction })
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 Starting performance tests...')
    this.results = []
    
    for (const test of this.tests) {
      const result = await this.runTest(test)
      this.results.push(result)
    }
    
    this.generateReport()
    return this.results
  }

  /**
   * 运行单个测试
   */
  async runTest(test) {
    console.log(`🧪 Running test: ${test.name}`)
    
    const startTime = performance.now()
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
    
    try {
      await test.testFunction()
      
      const endTime = performance.now()
      const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
      
      return {
        name: test.name,
        duration: endTime - startTime,
        memoryDelta: (endMemory - startMemory) / 1024 / 1024,
        status: 'passed'
      }
    } catch (error) {
      return {
        name: test.name,
        duration: performance.now() - startTime,
        memoryDelta: 0,
        status: 'failed',
        error: error.message
      }
    }
  }

  /**
   * 生成性能报告
   */
  generateReport() {
    console.group('📊 Performance Test Results')
    
    this.results.forEach(result => {
      const status = result.status === 'passed' ? '✅' : '❌'
      console.log(`${status} ${result.name}: ${result.duration.toFixed(2)}ms, Memory: ${result.memoryDelta.toFixed(2)}MB`)
      
      if (result.error) {
        console.error(`  Error: ${result.error}`)
      }
    })
    
    const totalTime = this.results.reduce((sum, result) => sum + result.duration, 0)
    const totalMemory = this.results.reduce((sum, result) => sum + result.memoryDelta, 0)
    
    console.log(`📊 Total: ${totalTime.toFixed(2)}ms, Memory: ${totalMemory.toFixed(2)}MB`)
    console.groupEnd()
  }
}

/**
 * 创建默认性能测试
 */
export function createDefaultPerformanceTests(animationSystem, particleManager) {
  const testSuite = new PerformanceTestSuite()
  
  testSuite.addTest('Animation System Initialization', async () => {
    await animationSystem.initialize()
  })
  
  testSuite.addTest('Particle System Update (1000 particles)', () => {
    for (let i = 0; i < 100; i++) {
      particleManager.update(0.016)
    }
  })
  
  testSuite.addTest('Memory Stress Test', () => {
    const tempArrays = []
    for (let i = 0; i < 1000; i++) {
      tempArrays.push(new Float32Array(1000))
    }
    // Arrays will be garbage collected
  })
  
  return testSuite
}

/**
 * 全局性能优化器实例
 */
export const performanceOptimizer = new PerformanceOptimizer()
export const memoryManager = new MemoryManager()