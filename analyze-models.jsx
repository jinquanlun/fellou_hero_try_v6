import React, { useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { analyzeAnimationData, findRingNodes, analyzeMotionPatterns, logAnalysisResults } from './animation-analyzer.js'

/**
 * 模型分析组件
 * 用于分析Scenes B和v6模型的动画数据
 */
export function ModelAnalyzer() {
  const [analysisResults, setAnalysisResults] = useState({})

  // 加载并分析所有相关模型
  const modelsToAnalyze = [
    '/Scenes_B_00100-transformed.glb',
    '/Scenes_B_0023-transformed.glb', 
    '/LOST_cut2_v6-transformed.glb'
  ]

  useEffect(() => {
    const runAnalysis = async () => {
      const results = {}
      
      for (const modelPath of modelsToAnalyze) {
        try {
          console.log(`🔍 Analyzing ${modelPath}...`)
          const analysis = analyzeAnimationData(modelPath)
          results[modelPath] = analysis
          
          // 输出分析结果到控制台
          logAnalysisResults(analysis)
          
          // 特别分析v6模型中的环结构
          if (modelPath.includes('v6')) {
            console.group('🎯 Ring Analysis for v6 model')
            const ringCandidates = findRingNodes(analysis.nodes)
            console.log('Ring candidates found:', ringCandidates)
            console.groupEnd()
          }
          
          // 分析运动模式
          if (analysis.animations.length > 0) {
            console.group('🎭 Motion Pattern Analysis')
            const motionPatterns = analyzeMotionPatterns(analysis.animations)
            console.log('Motion patterns:', motionPatterns)
            console.groupEnd()
          }
          
        } catch (error) {
          console.error(`❌ Failed to analyze ${modelPath}:`, error)
        }
      }
      
      setAnalysisResults(results)
      
      // 输出映射建议
      generateMappingSuggestions(results)
    }

    runAnalysis()
  }, [])

  return null // 这个组件只用于分析，不渲染任何内容
}

/**
 * 生成Scenes B到v6的映射建议
 */
function generateMappingSuggestions(analysisResults) {
  console.group('🗺️ Mapping Suggestions')
  
  const v6Analysis = analysisResults['/LOST_cut2_v6-transformed.glb']
  const scenesB00100 = analysisResults['/Scenes_B_00100-transformed.glb'] 
  const scenesB0023 = analysisResults['/Scenes_B_0023-transformed.glb']
  
  if (!v6Analysis) {
    console.warn('❌ v6 model analysis not available')
    console.groupEnd()
    return
  }

  // 分析v6模型中的场景结构
  console.log('📋 v6 Model Structure:')
  Object.entries(v6Analysis.nodes).forEach(([name, node]) => {
    if (node.hasGeometry) {
      console.log(`  - "${name}": position [${node.position.map(n => n.toFixed(2)).join(', ')}]`)
    }
  })

  // 查找三个环的候选对象
  const ringCandidates = findRingNodes(v6Analysis.nodes)
  console.log('\n🔍 Ring Candidates in v6:')
  ringCandidates.forEach((candidate, index) => {
    console.log(`  ${index + 1}. "${candidate.name}" (${candidate.confidence * 100}% confidence, ${candidate.reason})`)
  })

  // 分析Scenes B模型的动画对象
  if (scenesB00100 && scenesB00100.animations.length > 0) {
    console.log('\n🎭 Scenes B 00100 Animation Objects:')
    scenesB00100.animations.forEach(anim => {
      const motionPatterns = analyzeMotionPatterns([anim])
      Object.keys(motionPatterns[0].objects).forEach(objName => {
        console.log(`  - "${objName}": animated object`)
      })
    })
  }

  if (scenesB0023 && scenesB0023.animations.length > 0) {
    console.log('\n🎭 Scenes B 0023 Animation Objects:')
    scenesB0023.animations.forEach(anim => {
      const motionPatterns = analyzeMotionPatterns([anim])
      Object.keys(motionPatterns[0].objects).forEach(objName => {
        console.log(`  - "${objName}": animated object`)
      })
    })
  }

  // 生成映射建议
  console.log('\n💡 Mapping Suggestions:')
  console.log('1. 手动检查v6模型中的三个环对象')
  console.log('2. 比较Scenes B模型中对应的动画对象')
  console.log('3. 基于位置和命名模式建立映射关系')
  console.log('4. 提取动画轨道数据并应用到粒子系统')
  
  console.groupEnd()
}

/**
 * 专门用于分析特定模型的hook
 */
export function useModelAnalysis(modelPath) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        setLoading(true)
        const result = analyzeAnimationData(modelPath)
        setAnalysis(result)
        logAnalysisResults(result)
      } catch (err) {
        setError(err)
        console.error(`Failed to analyze ${modelPath}:`, err)
      } finally {
        setLoading(false)
      }
    }

    if (modelPath) {
      runAnalysis()
    }
  }, [modelPath])

  return { analysis, loading, error }
}

/**
 * 提取特定对象的动画数据
 */
export function extractObjectAnimation(animations, objectName) {
  const objectAnimations = []
  
  animations.forEach(animation => {
    const relevantTracks = animation.tracks.filter(track => 
      track.name.startsWith(objectName + '.')
    )
    
    if (relevantTracks.length > 0) {
      objectAnimations.push({
        name: animation.name,
        duration: animation.duration,
        tracks: relevantTracks
      })
    }
  })
  
  return objectAnimations
}