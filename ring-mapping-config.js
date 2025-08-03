/**
 * 环形对象映射配置
 * 定义Scenes B模型到v6模型中三个环的映射关系
 */

// v6模型中的三个环对象配置
export const V6_RINGS_CONFIG = {
  ring1: {
    name: 'Scenes_B_00100',
    groupName: 'Scenes_B_00100', 
    // 来自LOST_cut2_v6.jsx line 17
    position: [0.609, 14.249, -5.731],
    rotation: [-0.018, 0.004, 2.077],
    scale: 0.026,
    description: '第一个环 - 位于场景上方'
  },
  ring2: {
    name: 'Scenes_B_0023',
    groupName: 'Scenes_B_0023',
    // 来自LOST_cut2_v6.jsx line 29
    position: [11.171, 3.182, 11.142],
    rotation: [-1.132, -0.089, -2.546],
    scale: 0.039,
    description: '第二个环 - 位于场景右侧'
  },
  ring3: {
    name: 'Scenes_B_00100001', 
    groupName: 'Scenes_B_00100001',
    // 来自LOST_cut2_v6.jsx line 41
    position: [0.609, 0.7, 6.831],
    rotation: [-0.024, 0, 2.269],
    scale: [0.026, 0.026, 0.016],
    description: '第三个环 - 位于场景底部前方'
  }
}

// Scenes B模型的动画源配置
export const SCENES_B_SOURCES = {
  scenes_b_00100: {
    modelPath: '/Scenes_B_00100-transformed.glb',
    componentPath: './Scenes_B_00100.jsx',
    primaryObject: 'Scenes_B_00100', // 主要动画对象
    meshes: [
      '网格003', '网格003_1', '网格003_2', '网格003_3', '网格003_4',
      '网格003_5', '网格003_6', '网格003_7', '网格003_8', '网格003_9'
    ],
    description: '第一个Scenes B动画源'
  },
  scenes_b_0023: {
    modelPath: '/Scenes_B_0023-transformed.glb', 
    componentPath: './Scenes_B_0023.jsx',
    primaryObject: 'Scenes_B_0023', // 主要动画对象
    meshes: [
      '网格002', '网格002_1', '网格002_2', '网格002_3', '网格002_4',
      '网格002_5', '网格002_6', '网格002_7', '网格002_8', '网格002_9'
    ],
    description: '第二个Scenes B动画源'
  },
  scenes_b_00100_001: {
    modelPath: '/Scenes_B_00100.001-transformed.glb',
    componentPath: './001.jsx', 
    primaryObject: 'Scenes_B_00100001', // 主要动画对象
    meshes: [
      '网格001', '网格001_1', '网格001_2', '网格001_3', '网格001_4',
      '网格001_5', '网格001_6', '网格001_7', '网格001_8', '网格001_9'
    ],
    description: '第三个Scenes B动画源'
  }
}

// 映射关系配置
export const ANIMATION_MAPPING = {
  // v6环1 <- Scenes B 00100动画
  ring1: {
    source: 'scenes_b_00100',
    sourceObject: 'Scenes_B_00100',
    targetRing: 'ring1',
    transformations: {
      // 坐标系转换参数
      positionScale: 1.0,
      rotationOffset: [0, 0, 0],
      timeScale: 1.0
    }
  },
  // v6环2 <- Scenes B 0023动画  
  ring2: {
    source: 'scenes_b_0023',
    sourceObject: 'Scenes_B_0023', 
    targetRing: 'ring2',
    transformations: {
      positionScale: 1.0,
      rotationOffset: [0, 0, 0],
      timeScale: 1.0
    }
  },
  // v6环3 <- Scenes B 00100.001动画
  ring3: {
    source: 'scenes_b_00100_001',
    sourceObject: 'Scenes_B_00100001',
    targetRing: 'ring3', 
    transformations: {
      positionScale: 1.0,
      rotationOffset: [0, 0, 0],
      timeScale: 1.0
    }
  }
}

// 粒子系统配置
export const PARTICLE_CONFIG = {
  ring1: {
    particleCount: 1000,
    particleSize: 0.02,
    color: 0x00ff88,
    emissionRate: 50,
    lifetime: 3.0,
    trailLength: 20,
    glowIntensity: 1.5
  },
  ring2: {
    particleCount: 800,
    particleSize: 0.025,
    color: 0xff6600,
    emissionRate: 40,
    lifetime: 2.5,
    trailLength: 15,
    glowIntensity: 1.2
  },
  ring3: {
    particleCount: 1200,
    particleSize: 0.018,
    color: 0x0066ff,
    emissionRate: 60,
    lifetime: 3.5,
    trailLength: 25,
    glowIntensity: 1.8
  }
}

/**
 * 获取指定环的配置
 */
export function getRingConfig(ringId) {
  return V6_RINGS_CONFIG[ringId]
}

/**
 * 获取指定环的动画映射配置
 */
export function getAnimationMapping(ringId) {
  return ANIMATION_MAPPING[ringId]
}

/**
 * 获取动画源配置
 */
export function getSourceConfig(sourceId) {
  return SCENES_B_SOURCES[sourceId]
}

/**
 * 获取粒子配置
 */
export function getParticleConfig(ringId) {
  return PARTICLE_CONFIG[ringId]
}

/**
 * 验证映射配置的完整性
 */
export function validateMappingConfig() {
  const issues = []
  
  // 检查所有环是否都有对应的映射
  Object.keys(V6_RINGS_CONFIG).forEach(ringId => {
    if (!ANIMATION_MAPPING[ringId]) {
      issues.push(`Missing animation mapping for ring: ${ringId}`)
    }
    if (!PARTICLE_CONFIG[ringId]) {
      issues.push(`Missing particle config for ring: ${ringId}`)
    }
  })
  
  // 检查映射的源是否存在
  Object.values(ANIMATION_MAPPING).forEach(mapping => {
    if (!SCENES_B_SOURCES[mapping.source]) {
      issues.push(`Missing source config: ${mapping.source}`)
    }
  })
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * 输出配置摘要
 */
export function logConfigSummary() {
  console.group('🎯 Ring Mapping Configuration Summary')
  
  console.group('📍 V6 Rings')
  Object.entries(V6_RINGS_CONFIG).forEach(([id, config]) => {
    console.log(`${id}: "${config.name}" at [${config.position.join(', ')}]`)
  })
  console.groupEnd()
  
  console.group('🎬 Animation Sources')
  Object.entries(SCENES_B_SOURCES).forEach(([id, config]) => {
    console.log(`${id}: "${config.primaryObject}" from ${config.modelPath}`)
  })
  console.groupEnd()
  
  console.group('🔄 Mappings')
  Object.entries(ANIMATION_MAPPING).forEach(([ringId, mapping]) => {
    console.log(`${ringId} <- ${mapping.source} (${mapping.sourceObject})`)
  })
  console.groupEnd()
  
  const validation = validateMappingConfig()
  if (validation.isValid) {
    console.log('✅ Configuration is valid')
  } else {
    console.warn('⚠️ Configuration issues:', validation.issues)
  }
  
  console.groupEnd()
}