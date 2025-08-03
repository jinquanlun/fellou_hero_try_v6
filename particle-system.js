import * as THREE from 'three'
import { getParticleConfig } from './ring-mapping-config.js'
import { animationMappingSystem } from './animation-mapping-system.js'

/**
 * 粒子系统基类
 * 提供通用的粒子管理和渲染功能
 */
export class ParticleSystem {
  constructor(config = {}) {
    this.config = {
      particleCount: 1000,
      particleSize: 0.02,
      color: 0xffffff,
      emissionRate: 50,
      lifetime: 3.0,
      ...config
    }

    this.particles = []
    this.particlePool = []
    this.geometry = null
    this.material = null
    this.mesh = null
    this.isActive = false
    this.time = 0
    
    this.initializeGeometry()
    this.initializeMaterial()
    this.initializeParticlePool()
  }

  /**
   * 初始化粒子几何体
   */
  initializeGeometry() {
    this.geometry = new THREE.BufferGeometry()
    
    // 创建缓冲区数组
    const positions = new Float32Array(this.config.particleCount * 3)
    const colors = new Float32Array(this.config.particleCount * 3) 
    const sizes = new Float32Array(this.config.particleCount)
    const alphas = new Float32Array(this.config.particleCount)
    const velocities = new Float32Array(this.config.particleCount * 3)
    const lifetimes = new Float32Array(this.config.particleCount)
    const ages = new Float32Array(this.config.particleCount)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    this.geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    this.geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1))
  }

  /**
   * 初始化粒子材质
   */
  initializeMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointTexture: { value: this.createParticleTexture() },
        baseColor: { value: new THREE.Color(this.config.color) }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }

  /**
   * 创建粒子纹理
   */
  createParticleTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    
    const context = canvas.getContext('2d')
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.2, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  /**
   * 顶点着色器
   */
  getVertexShader() {
    return `
      attribute float size;
      attribute float alpha;
      attribute float age;
      attribute float lifetime;
      attribute vec3 color;
      
      varying float vAlpha;
      varying vec3 vColor;
      
      void main() {
        vAlpha = alpha * (1.0 - age / lifetime);
        vColor = color;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `
  }

  /**
   * 片段着色器
   */
  getFragmentShader() {
    return `
      uniform sampler2D pointTexture;
      uniform vec3 baseColor;
      
      varying float vAlpha;
      varying vec3 vColor;
      
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(baseColor * vColor, vAlpha * texColor.a);
      }
    `
  }

  /**
   * 初始化粒子池
   */
  initializeParticlePool() {
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particlePool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: this.config.particleSize,
        alpha: 1.0,
        age: 0,
        lifetime: this.config.lifetime,
        isActive: false
      })
    }

    // 创建Points网格
    this.mesh = new THREE.Points(this.geometry, this.material)
  }

  /**
   * 发射粒子
   */
  emitParticle(position, velocity = null, customConfig = {}) {
    const particle = this.getInactiveParticle()
    if (!particle) return null

    particle.position.copy(position)
    particle.velocity.copy(velocity || new THREE.Vector3())
    particle.color.setHex(customConfig.color || this.config.color)
    particle.size = customConfig.size || this.config.particleSize
    particle.alpha = 1.0
    particle.age = 0
    particle.lifetime = customConfig.lifetime || this.config.lifetime
    particle.isActive = true

    this.particles.push(particle)
    return particle
  }

  /**
   * 获取非活跃粒子
   */
  getInactiveParticle() {
    return this.particlePool.find(p => !p.isActive)
  }

  /**
   * 更新粒子系统
   */
  update(deltaTime) {
    this.time += deltaTime
    this.material.uniforms.time.value = this.time

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      
      particle.age += deltaTime
      
      // 检查粒子生命周期
      if (particle.age >= particle.lifetime) {
        particle.isActive = false
        this.particles.splice(i, 1)
        continue
      }

      // 更新粒子位置
      particle.position.addScaledVector(particle.velocity, deltaTime)
      
      // 更新粒子属性
      this.updateParticleAttributes(particle, deltaTime)
    }

    // 更新缓冲区
    this.updateBufferAttributes()
  }

  /**
   * 更新粒子属性（子类可重写）
   */
  updateParticleAttributes(particle, deltaTime) {
    // 基础的生命周期透明度衰减
    const lifeRatio = particle.age / particle.lifetime
    particle.alpha = 1.0 - lifeRatio
  }

  /**
   * 更新缓冲区属性
   */
  updateBufferAttributes() {
    const positions = this.geometry.attributes.position.array
    const colors = this.geometry.attributes.color.array
    const sizes = this.geometry.attributes.size.array
    const alphas = this.geometry.attributes.alpha.array
    const ages = this.geometry.attributes.age.array
    const lifetimes = this.geometry.attributes.lifetime.array

    // 清空数组
    positions.fill(0)
    colors.fill(0)
    sizes.fill(0)
    alphas.fill(0)
    ages.fill(0)
    lifetimes.fill(0)

    // 填充活跃粒子数据
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      const i3 = i * 3

      positions[i3] = particle.position.x
      positions[i3 + 1] = particle.position.y
      positions[i3 + 2] = particle.position.z

      colors[i3] = particle.color.r
      colors[i3 + 1] = particle.color.g
      colors[i3 + 2] = particle.color.b

      sizes[i] = particle.size
      alphas[i] = particle.alpha
      ages[i] = particle.age
      lifetimes[i] = particle.lifetime
    }

    // 更新缓冲区
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.attributes.alpha.needsUpdate = true
    this.geometry.attributes.age.needsUpdate = true
    this.geometry.attributes.lifetime.needsUpdate = true

    // 设置绘制范围
    this.geometry.setDrawRange(0, this.particles.length)
  }

  /**
   * 清除所有粒子
   */
  clear() {
    this.particles.forEach(particle => {
      particle.isActive = false
    })
    this.particles.length = 0
  }

  /**
   * 获取网格对象
   */
  getMesh() {
    return this.mesh
  }

  /**
   * 销毁粒子系统
   */
  dispose() {
    this.clear()
    if (this.geometry) this.geometry.dispose()
    if (this.material) this.material.dispose()
    if (this.material.uniforms.pointTexture.value) {
      this.material.uniforms.pointTexture.value.dispose()
    }
  }
}

/**
 * 环形轨迹粒子系统
 * 专门用于跟随环运动的粒子效果
 */
export class RingTrailParticleSystem extends ParticleSystem {
  constructor(ringId, config = {}) {
    const ringConfig = getParticleConfig(ringId)
    const mergedConfig = { ...ringConfig, ...config }
    
    super(mergedConfig)
    
    this.ringId = ringId
    this.lastRingPosition = new THREE.Vector3()
    this.emissionTimer = 0
    this.trailPositions = []
    this.maxTrailLength = mergedConfig.trailLength || 20
  }

  /**
   * 更新环轨迹粒子系统
   */
  update(deltaTime) {
    super.update(deltaTime)

    if (!animationMappingSystem.isPlaying) {
      return
    }

    // 获取当前环位置
    const currentRingPosition = animationMappingSystem.getRingPosition(this.ringId)
    
    // 检查环是否移动了
    if (currentRingPosition.distanceTo(this.lastRingPosition) > 0.01) {
      this.addTrailPosition(currentRingPosition.clone())
      this.lastRingPosition.copy(currentRingPosition)
    }

    // 发射粒子
    this.emissionTimer += deltaTime
    const emissionInterval = 1.0 / this.config.emissionRate
    
    if (this.emissionTimer >= emissionInterval) {
      this.emitTrailParticles()
      this.emissionTimer = 0
    }
  }

  /**
   * 添加轨迹位置点
   */
  addTrailPosition(position) {
    this.trailPositions.push(position)
    
    // 限制轨迹长度
    if (this.trailPositions.length > this.maxTrailLength) {
      this.trailPositions.shift()
    }
  }

  /**
   * 发射轨迹粒子
   */
  emitTrailParticles() {
    if (this.trailPositions.length < 2) return

    // 在轨迹上发射粒子
    for (let i = 0; i < this.trailPositions.length - 1; i++) {
      const position = this.trailPositions[i].clone()
      
      // 添加一些随机偏移
      position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ))

      // 计算粒子生命周期（轨迹后端的粒子寿命更短）
      const lifeScale = i / (this.trailPositions.length - 1)
      const lifetime = this.config.lifetime * (0.3 + lifeScale * 0.7)

      this.emitParticle(position, null, { lifetime })
    }
  }

  /**
   * 更新粒子属性（重写以添加轨迹效果）
   */
  updateParticleAttributes(particle, deltaTime) {
    super.updateParticleAttributes(particle, deltaTime)

    // 添加发光效果
    const lifeRatio = particle.age / particle.lifetime
    particle.size = this.config.particleSize * (1.5 - lifeRatio * 0.5)
    
    // 颜色变化
    const intensity = 1.0 - lifeRatio
    particle.color.multiplyScalar(0.99 + intensity * 0.01)
  }
}

/**
 * 粒子系统管理器
 */
export class ParticleSystemManager {
  constructor() {
    this.systems = new Map()
    this.scene = null
  }

  /**
   * 初始化管理器
   */
  initialize(scene) {
    this.scene = scene
    
    // 为每个环创建粒子系统
    const ringIds = ['ring1', 'ring2', 'ring3']
    ringIds.forEach(ringId => {
      const system = new RingTrailParticleSystem(ringId)
      this.systems.set(ringId, system)
      this.scene.add(system.getMesh())
    })

    console.log('🎆 Particle System Manager initialized')
  }

  /**
   * 更新所有粒子系统
   */
  update(deltaTime) {
    this.systems.forEach(system => {
      system.update(deltaTime)
    })
  }

  /**
   * 获取指定环的粒子系统
   */
  getSystem(ringId) {
    return this.systems.get(ringId)
  }

  /**
   * 清除所有粒子
   */
  clearAll() {
    this.systems.forEach(system => {
      system.clear()
    })
  }

  /**
   * 销毁管理器
   */
  dispose() {
    this.systems.forEach(system => {
      if (this.scene) {
        this.scene.remove(system.getMesh())
      }
      system.dispose()
    })
    this.systems.clear()
  }
}

/**
 * 全局粒子系统管理器实例
 */
export const particleSystemManager = new ParticleSystemManager()