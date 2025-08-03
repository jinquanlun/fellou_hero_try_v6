import * as THREE from 'three'

/**
 * 高级粒子着色器
 * 提供发光、轨迹、颜色变化等视觉效果
 */
export class AdvancedParticleShader {
  static getVertexShader() {
    return `
      attribute float size;
      attribute float alpha;
      attribute float age;
      attribute float lifetime;
      attribute vec3 color;
      attribute vec3 velocity;
      
      uniform float time;
      uniform float glowIntensity;
      uniform vec3 cameraPosition;
      
      varying float vAlpha;
      varying vec3 vColor;
      varying float vGlow;
      varying float vLifeRatio;
      varying vec3 vViewDirection;
      
      void main() {
        vLifeRatio = age / lifetime;
        vAlpha = alpha * (1.0 - vLifeRatio);
        vColor = color;
        
        // 计算发光强度（基于速度和生命周期）
        float velocityMagnitude = length(velocity);
        vGlow = glowIntensity * (1.0 + velocityMagnitude * 0.5) * (1.0 - vLifeRatio * 0.3);
        
        // 计算视角方向用于边缘发光
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        
        // 动态大小（基于速度和生命周期）
        float dynamicSize = size * (1.0 + sin(time * 2.0 + age) * 0.2);
        dynamicSize *= (0.8 + vLifeRatio * 0.4); // 生命周期影响大小
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = dynamicSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `
  }

  static getFragmentShader() {
    return `
      uniform sampler2D pointTexture;
      uniform vec3 baseColor;
      uniform float time;
      uniform float glowIntensity;
      
      varying float vAlpha;
      varying vec3 vColor;
      varying float vGlow;
      varying float vLifeRatio;
      varying vec3 vViewDirection;
      
      void main() {
        vec2 uv = gl_PointCoord;
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);
        
        // 创建软边缘
        float softEdge = 1.0 - smoothstep(0.3, 0.5, dist);
        
        // 内核发光
        float coreGlow = 1.0 - smoothstep(0.0, 0.2, dist);
        coreGlow = pow(coreGlow, 2.0);
        
        // 外层光晕
        float outerGlow = 1.0 - smoothstep(0.2, 0.5, dist);
        outerGlow = pow(outerGlow, 0.5);
        
        // 时间动画
        float timeAnim = sin(time * 3.0 + vLifeRatio * 6.28) * 0.5 + 0.5;
        
        // 组合颜色
        vec3 finalColor = baseColor * vColor;
        finalColor += vGlow * glowIntensity * (coreGlow * 2.0 + outerGlow * 0.5);
        finalColor *= (0.8 + timeAnim * 0.4);
        
        // 计算最终透明度
        float finalAlpha = vAlpha * softEdge;
        finalAlpha *= (coreGlow * 0.8 + outerGlow * 0.4);
        
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `
  }

  static createMaterial(baseColor = 0xffffff, glowIntensity = 1.5) {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointTexture: { value: null },
        baseColor: { value: new THREE.Color(baseColor) },
        glowIntensity: { value: glowIntensity },
        cameraPosition: { value: new THREE.Vector3() }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }
}

/**
 * 轨迹渲染系统
 * 创建粒子运动轨迹的视觉效果
 */
export class TrailRenderer {
  constructor(maxTrailLength = 50) {
    this.maxTrailLength = maxTrailLength
    this.trails = new Map() // ringId -> trail data
    this.trailMeshes = new Map() // ringId -> mesh
    
    this.initializeTrails()
  }

  initializeTrails() {
    const ringIds = ['ring1', 'ring2', 'ring3']
    const colors = [0x00ff88, 0xff6600, 0x0066ff]
    
    ringIds.forEach((ringId, index) => {
      this.trails.set(ringId, {
        positions: [],
        colors: [],
        times: []
      })
      
      // 创建轨迹几何体
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(this.maxTrailLength * 3)
      const trailColors = new Float32Array(this.maxTrailLength * 3)
      const alphas = new Float32Array(this.maxTrailLength)
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3))
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
      
      // 创建轨迹材质
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          baseColor: { value: new THREE.Color(colors[index]) }
        },
        vertexShader: this.getTrailVertexShader(),
        fragmentShader: this.getTrailFragmentShader(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 3
      })
      
      const mesh = new THREE.Line(geometry, material)
      this.trailMeshes.set(ringId, mesh)
    })
  }

  getTrailVertexShader() {
    return `
      attribute float alpha;
      
      uniform float time;
      uniform vec3 baseColor;
      
      varying float vAlpha;
      varying vec3 vColor;
      
      void main() {
        vAlpha = alpha;
        vColor = color;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
  }

  getTrailFragmentShader() {
    return `
      uniform vec3 baseColor;
      
      varying float vAlpha;
      varying vec3 vColor;
      
      void main() {
        gl_FragColor = vec4(baseColor * vColor, vAlpha * 0.8);
      }
    `
  }

  /**
   * 添加轨迹点
   */
  addTrailPoint(ringId, position, time) {
    const trail = this.trails.get(ringId)
    if (!trail) return

    trail.positions.push(position.clone())
    trail.times.push(time)
    
    // 限制轨迹长度
    if (trail.positions.length > this.maxTrailLength) {
      trail.positions.shift()
      trail.times.shift()
    }
    
    this.updateTrailGeometry(ringId)
  }

  /**
   * 更新轨迹几何体
   */
  updateTrailGeometry(ringId) {
    const trail = this.trails.get(ringId)
    const mesh = this.trailMeshes.get(ringId)
    
    if (!trail || !mesh || trail.positions.length < 2) return

    const geometry = mesh.geometry
    const positions = geometry.attributes.position.array
    const colors = geometry.attributes.color.array
    const alphas = geometry.attributes.alpha.array
    
    // 清空数组
    positions.fill(0)
    colors.fill(1)
    alphas.fill(0)
    
    // 填充轨迹数据
    for (let i = 0; i < trail.positions.length; i++) {
      const pos = trail.positions[i]
      const alpha = i / (trail.positions.length - 1) // 渐变透明度
      
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z
      
      alphas[i] = alpha * 0.8
    }
    
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.alpha.needsUpdate = true
    geometry.setDrawRange(0, trail.positions.length)
  }

  /**
   * 更新所有轨迹
   */
  update(time) {
    this.trailMeshes.forEach(mesh => {
      mesh.material.uniforms.time.value = time
    })
  }

  /**
   * 获取轨迹网格
   */
  getTrailMeshes() {
    return Array.from(this.trailMeshes.values())
  }

  /**
   * 清除轨迹
   */
  clearTrails() {
    this.trails.forEach(trail => {
      trail.positions.length = 0
      trail.times.length = 0
    })
  }
}

/**
 * 连接线效果
 * 在粒子之间创建动态连接线
 */
export class ParticleConnectionEffect {
  constructor(maxConnections = 100, connectionDistance = 2.0) {
    this.maxConnections = maxConnections
    this.connectionDistance = connectionDistance
    this.connections = []
    
    this.initializeGeometry()
  }

  initializeGeometry() {
    this.geometry = new THREE.BufferGeometry()
    
    const positions = new Float32Array(this.maxConnections * 6) // 2 points per line
    const colors = new Float32Array(this.maxConnections * 6)
    const alphas = new Float32Array(this.maxConnections * 2)
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        connectionOpacity: { value: 0.3 }
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
          vAlpha = alpha;
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float connectionOpacity;
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
          gl_FragColor = vec4(vColor, vAlpha * connectionOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    this.mesh = new THREE.LineSegments(this.geometry, this.material)
  }

  /**
   * 更新粒子连接
   */
  updateConnections(particleSystems) {
    this.connections.length = 0
    
    // 收集所有活跃粒子
    const allParticles = []
    Object.values(particleSystems).forEach(system => {
      if (system && system.particles) {
        system.particles.forEach(particle => {
          allParticles.push(particle)
        })
      }
    })
    
    // 计算粒子间连接
    for (let i = 0; i < allParticles.length && this.connections.length < this.maxConnections; i++) {
      for (let j = i + 1; j < allParticles.length && this.connections.length < this.maxConnections; j++) {
        const p1 = allParticles[i]
        const p2 = allParticles[j]
        
        const distance = p1.position.distanceTo(p2.position)
        
        if (distance < this.connectionDistance) {
          const alpha = 1.0 - (distance / this.connectionDistance)
          this.connections.push({
            start: p1.position.clone(),
            end: p2.position.clone(),
            alpha: alpha * 0.5,
            color: p1.color.clone().lerp(p2.color, 0.5)
          })
        }
      }
    }
    
    this.updateGeometry()
  }

  /**
   * 更新几何体
   */
  updateGeometry() {
    const positions = this.geometry.attributes.position.array
    const colors = this.geometry.attributes.color.array
    const alphas = this.geometry.attributes.alpha.array
    
    // 清空数组
    positions.fill(0)
    colors.fill(0)
    alphas.fill(0)
    
    // 填充连接数据
    for (let i = 0; i < this.connections.length; i++) {
      const connection = this.connections[i]
      const i6 = i * 6
      const i2 = i * 2
      
      // 起点
      positions[i6] = connection.start.x
      positions[i6 + 1] = connection.start.y
      positions[i6 + 2] = connection.start.z
      
      // 终点
      positions[i6 + 3] = connection.end.x
      positions[i6 + 4] = connection.end.y
      positions[i6 + 5] = connection.end.z
      
      // 颜色
      colors[i6] = connection.color.r
      colors[i6 + 1] = connection.color.g
      colors[i6 + 2] = connection.color.b
      colors[i6 + 3] = connection.color.r
      colors[i6 + 4] = connection.color.g
      colors[i6 + 5] = connection.color.b
      
      // 透明度
      alphas[i2] = connection.alpha
      alphas[i2 + 1] = connection.alpha
    }
    
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.alpha.needsUpdate = true
    this.geometry.setDrawRange(0, this.connections.length * 2)
  }

  /**
   * 更新效果
   */
  update(time) {
    this.material.uniforms.time.value = time
  }

  /**
   * 获取网格
   */
  getMesh() {
    return this.mesh
  }
}

/**
 * 视觉效果管理器
 */
export class VisualEffectsManager {
  constructor() {
    this.trailRenderer = new TrailRenderer()
    this.connectionEffect = new ParticleConnectionEffect()
    this.isInitialized = false
    this.scene = null
    this.time = 0
  }

  /**
   * 初始化视觉效果
   */
  initialize(scene) {
    this.scene = scene
    
    // 添加轨迹效果到场景
    this.trailRenderer.getTrailMeshes().forEach(mesh => {
      scene.add(mesh)
    })
    
    // 添加连接效果到场景
    scene.add(this.connectionEffect.getMesh())
    
    this.isInitialized = true
    console.log('✨ Visual Effects Manager initialized')
  }

  /**
   * 更新视觉效果
   */
  update(deltaTime, particleSystems, animationSystem) {
    if (!this.isInitialized) return
    
    this.time += deltaTime
    
    // 更新轨迹效果
    if (animationSystem.isPlaying) {
      Object.keys(particleSystems).forEach(ringId => {
        const position = animationSystem.getRingPosition(ringId)
        if (position) {
          this.trailRenderer.addTrailPoint(ringId, position, this.time)
        }
      })
    }
    
    this.trailRenderer.update(this.time)
    
    // 更新连接效果
    this.connectionEffect.updateConnections(particleSystems)
    this.connectionEffect.update(this.time)
  }

  /**
   * 清除所有效果
   */
  clearEffects() {
    this.trailRenderer.clearTrails()
  }

  /**
   * 销毁管理器
   */
  dispose() {
    if (this.scene) {
      this.trailRenderer.getTrailMeshes().forEach(mesh => {
        this.scene.remove(mesh)
      })
      this.scene.remove(this.connectionEffect.getMesh())
    }
  }
}

/**
 * 全局视觉效果管理器实例
 */
export const visualEffectsManager = new VisualEffectsManager()