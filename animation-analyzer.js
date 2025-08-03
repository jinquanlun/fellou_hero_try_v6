import { useGLTF } from '@react-three/drei'

/**
 * 动画数据分析工具
 * 用于分析GLTF模型中的动画数据结构
 */
export function analyzeAnimationData(gltfPath) {
  const { nodes, materials, animations } = useGLTF(gltfPath)
  
  const analysisResult = {
    modelPath: gltfPath,
    nodesCount: Object.keys(nodes).length,
    materialsCount: Object.keys(materials).length,
    animationsCount: animations.length,
    nodes: {},
    animations: [],
    sceneStructure: []
  }

  // 分析节点结构
  Object.entries(nodes).forEach(([name, node]) => {
    analysisResult.nodes[name] = {
      type: node.type,
      position: node.position?.toArray() || [0, 0, 0],
      rotation: node.rotation?.toArray() || [0, 0, 0, 1],
      scale: node.scale?.toArray() || [1, 1, 1],
      hasGeometry: !!node.geometry,
      hasMaterial: !!node.material,
      children: node.children?.length || 0
    }
  })

  // 分析动画数据
  animations.forEach((animation, index) => {
    const animData = {
      name: animation.name,
      duration: animation.duration,
      tracksCount: animation.tracks.length,
      tracks: []
    }

    animation.tracks.forEach(track => {
      const trackInfo = {
        name: track.name,
        type: track.constructor.name,
        valueSizes: track.getValueSize ? track.getValueSize() : 'unknown',
        timesLength: track.times.length,
        valuesLength: track.values.length,
        // 提取关键时间点
        keyTimes: track.times.slice(0, Math.min(5, track.times.length)),
        // 提取前几个关键值
        keyValues: Array.from(track.values.slice(0, Math.min(15, track.values.length)))
      }
      animData.tracks.push(trackInfo)
    })

    analysisResult.animations.push(animData)
  })

  return analysisResult
}

/**
 * 查找包含环形几何体的节点
 * 基于节点名称、位置或几何特征识别
 */
export function findRingNodes(nodes) {
  const ringCandidates = []
  
  Object.entries(nodes).forEach(([name, node]) => {
    // 基于命名模式识别
    const isRingByName = /ring|环|circle|torus/i.test(name)
    
    // 基于几何特征识别（如果有geometry）
    let isRingByGeometry = false
    if (node.geometry) {
      // 检查几何体是否类似环形
      const geometry = node.geometry
      isRingByGeometry = geometry.type === 'TorusGeometry' || 
                        geometry.type === 'TorusKnotGeometry' ||
                        (geometry.attributes && 
                         geometry.attributes.position && 
                         geometry.attributes.position.count > 100) // 复杂几何体可能是环
    }

    if (isRingByName || isRingByGeometry) {
      ringCandidates.push({
        name,
        node,
        confidence: isRingByName ? 0.8 : 0.6,
        reason: isRingByName ? 'name-based' : 'geometry-based'
      })
    }
  })

  return ringCandidates.sort((a, b) => b.confidence - a.confidence)
}

/**
 * 分析动画轨道中的运动模式
 */
export function analyzeMotionPatterns(animations) {
  return animations.map(animation => {
    const motionAnalysis = {
      name: animation.name,
      duration: animation.duration,
      objects: {}
    }

    animation.tracks.forEach(track => {
      const objectName = track.name.split('.')[0] // 获取对象名称
      const propertyName = track.name.split('.')[1] // position, rotation, scale
      
      if (!motionAnalysis.objects[objectName]) {
        motionAnalysis.objects[objectName] = {}
      }

      // 分析运动范围和模式
      const values = track.values
      const times = track.times
      
      if (propertyName === 'position') {
        const positions = []
        for (let i = 0; i < values.length; i += 3) {
          positions.push([values[i], values[i + 1], values[i + 2]])
        }
        
        motionAnalysis.objects[objectName].position = {
          start: positions[0],
          end: positions[positions.length - 1],
          range: calculateRange(positions),
          keyframes: positions.length,
          isCircular: detectCircularMotion(positions)
        }
      }
      
      if (propertyName === 'rotation') {
        const rotations = []
        for (let i = 0; i < values.length; i += 4) {
          rotations.push([values[i], values[i + 1], values[i + 2], values[i + 3]])
        }
        
        motionAnalysis.objects[objectName].rotation = {
          start: rotations[0],
          end: rotations[rotations.length - 1],
          keyframes: rotations.length,
          totalRotation: calculateTotalRotation(rotations)
        }
      }
    })

    return motionAnalysis
  })
}

// 辅助函数：计算位置范围
function calculateRange(positions) {
  if (positions.length === 0) return { x: 0, y: 0, z: 0 }
  
  const xs = positions.map(p => p[0])
  const ys = positions.map(p => p[1]) 
  const zs = positions.map(p => p[2])
  
  return {
    x: Math.max(...xs) - Math.min(...xs),
    y: Math.max(...ys) - Math.min(...ys),
    z: Math.max(...zs) - Math.min(...zs)
  }
}

// 辅助函数：检测圆形运动
function detectCircularMotion(positions) {
  if (positions.length < 4) return false
  
  // 简单的圆形运动检测：检查是否回到起始位置附近
  const start = positions[0]
  const end = positions[positions.length - 1]
  const distance = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + 
    Math.pow(end[1] - start[1], 2) + 
    Math.pow(end[2] - start[2], 2)
  )
  
  return distance < 0.1 // 如果终点接近起点，可能是圆形运动
}

// 辅助函数：计算总旋转量
function calculateTotalRotation(rotations) {
  // 这里可以实现四元数旋转量的计算
  return rotations.length > 1 ? 'rotating' : 'static'
}

/**
 * 导出分析结果到控制台
 */
export function logAnalysisResults(analysisResult) {
  console.group(`🔍 Animation Analysis: ${analysisResult.modelPath}`)
  console.log(`📊 Stats: ${analysisResult.nodesCount} nodes, ${analysisResult.animationsCount} animations`)
  
  console.group('🎭 Animations')
  analysisResult.animations.forEach(anim => {
    console.log(`"${anim.name}": ${anim.duration}s, ${anim.tracksCount} tracks`)
    anim.tracks.forEach(track => {
      console.log(`  - ${track.name}: ${track.type} (${track.timesLength} keyframes)`)
    })
  })
  console.groupEnd()
  
  console.group('🎯 Nodes')
  Object.entries(analysisResult.nodes).forEach(([name, node]) => {
    if (node.hasGeometry) {
      console.log(`"${name}": ${node.type} at [${node.position.map(n => n.toFixed(2)).join(', ')}]`)
    }
  })
  console.groupEnd()
  
  console.groupEnd()
}