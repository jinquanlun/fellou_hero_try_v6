import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * 动画分析组件
 * 详细分析v6模型的动画数据和播放状态
 */
const AnimationAnalyzer = forwardRef(({ 
  onAnimationInfoChange, 
  onPlayingChange, 
  onTimeChange 
}, ref) => {
  const group = useRef()
  const [animationInfo, setAnimationInfo] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  // 加载v6模型
  const { nodes, materials, animations } = useGLTF('/LOST_cut2_v6-transformed.glb')
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    console.group('🔍 V6 Model Animation Analysis')
    
    // 分析节点结构
    console.log('📋 Available nodes:', Object.keys(nodes))
    console.log('🎨 Available materials:', Object.keys(materials))
    console.log('🎬 Animation names:', names)
    console.log('📊 Total animations:', animations.length)

    // 详细分析每个动画
    const detailedInfo = animations.map((animation, index) => {
      console.log(`\n🎭 Animation ${index}: "${animation.name}"`)
      console.log(`⏱️ Duration: ${animation.duration}s`)
      console.log(`📍 Tracks: ${animation.tracks.length}`)
      
      const trackInfo = animation.tracks.map(track => {
        const trackName = track.name
        const parts = trackName.split('.')
        const objectName = parts[0]
        const propertyName = parts[1]
        
        console.log(`  📌 Track: ${trackName}`)
        console.log(`    Object: ${objectName}`)
        console.log(`    Property: ${propertyName}`)
        console.log(`    Keyframes: ${track.times.length}`)
        console.log(`    Values length: ${track.values.length}`)
        console.log(`    Sample times: [${track.times.slice(0, 3).map(t => t.toFixed(2)).join(', ')}...]`)
        
        // 分析值的变化范围
        if (propertyName === 'position' && track.values.length >= 6) {
          const firstPos = [track.values[0], track.values[1], track.values[2]]
          const lastPos = [track.values[track.values.length-3], track.values[track.values.length-2], track.values[track.values.length-1]]
          const distance = Math.sqrt(
            Math.pow(lastPos[0] - firstPos[0], 2) + 
            Math.pow(lastPos[1] - firstPos[1], 2) + 
            Math.pow(lastPos[2] - firstPos[2], 2)
          )
          console.log(`    Position change: [${firstPos.map(v => v.toFixed(3)).join(', ')}] → [${lastPos.map(v => v.toFixed(3)).join(', ')}]`)
          console.log(`    Total movement: ${distance.toFixed(3)} units`)
        }
        
        return {
          name: trackName,
          objectName,
          propertyName,
          keyframes: track.times.length,
          valuesLength: track.values.length,
          times: track.times,
          values: track.values
        }
      })

      return {
        name: animation.name,
        duration: animation.duration,
        tracks: trackInfo
      }
    })

    setAnimationInfo(detailedInfo)
    
    // 通知父组件
    if (onAnimationInfoChange) {
      onAnimationInfoChange(detailedInfo)
    }
    
    // 查找环相关的轨道
    console.log('\n🎯 Ring-related tracks:')
    const ringObjects = ['Scenes_B_00100', 'Scenes_B_0023', 'Scenes_B_00100001']
    
    animations.forEach(animation => {
      animation.tracks.forEach(track => {
        const objectName = track.name.split('.')[0]
        if (ringObjects.includes(objectName)) {
          console.log(`✅ Found ring track: ${track.name}`)
        }
      })
    })

    console.groupEnd()
  }, [animations, nodes, materials, names, onAnimationInfoChange])

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    playAnimation,
    stopAnimation
  }))

  // 播放控制
  const playAnimation = () => {
    if (names.length > 0) {
      const action = actions[names[0]]
      if (action) {
        action.reset().play()
        setIsPlaying(true)
        if (onPlayingChange) onPlayingChange(true)
        console.log(`▶️ Playing animation: ${names[0]}`)
      }
    }
  }

  const stopAnimation = () => {
    Object.values(actions).forEach(action => {
      if (action) action.stop()
    })
    setIsPlaying(false)
    setCurrentTime(0)
    if (onPlayingChange) onPlayingChange(false)
    if (onTimeChange) onTimeChange(0)
    console.log('⏹️ Animation stopped')
  }

  // 更新当前时间
  useFrame(() => {
    if (isPlaying && names.length > 0) {
      const action = actions[names[0]]
      if (action) {
        setCurrentTime(action.time)
        if (onTimeChange) onTimeChange(action.time)
      }
    }
  })

  return (
    <>
      <group ref={group}>
        {/* 渲染v6模型 */}
        <group name="Scene">
          <group name="Scenes_B_00100" position={[0.609, 14.249, -5.731]} rotation={[-0.018, 0.004, 2.077]} scale={0.026}>
            <mesh name="網格003" geometry={nodes.網格003?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_1" geometry={nodes.網格003_1?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_2" geometry={nodes.網格003_2?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_3" geometry={nodes.網格003_3?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_4" geometry={nodes.網格003_4?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_5" geometry={nodes.網格003_5?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_6" geometry={nodes.網格003_6?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_7" geometry={nodes.網格003_7?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_8" geometry={nodes.網格003_8?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格003_9" geometry={nodes.網格003_9?.geometry} material={materials.PaletteMaterial001} />
          </group>
          <group name="Scenes_B_0023" position={[11.171, 3.182, 11.142]} rotation={[-1.132, -0.089, -2.546]} scale={0.039}>
            <mesh name="網格002" geometry={nodes.網格002?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_1" geometry={nodes.網格002_1?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_2" geometry={nodes.網格002_2?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_3" geometry={nodes.網格002_3?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_4" geometry={nodes.網格002_4?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_5" geometry={nodes.網格002_5?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_6" geometry={nodes.網格002_6?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_7" geometry={nodes.網格002_7?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_8" geometry={nodes.網格002_8?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格002_9" geometry={nodes.網格002_9?.geometry} material={materials.PaletteMaterial001} />
          </group>
          <group name="Scenes_B_00100001" position={[0.609, 0.7, 6.831]} rotation={[-0.024, 0, 2.269]} scale={[0.026, 0.026, 0.016]}>
            <mesh name="網格001" geometry={nodes.網格001?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_1" geometry={nodes.網格001_1?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_2" geometry={nodes.網格001_2?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_3" geometry={nodes.網格001_3?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_4" geometry={nodes.網格001_4?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_5" geometry={nodes.網格001_5?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_6" geometry={nodes.網格001_6?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_7" geometry={nodes.網格001_7?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_8" geometry={nodes.網格001_8?.geometry} material={materials.PaletteMaterial001} />
            <mesh name="網格001_9" geometry={nodes.網格001_9?.geometry} material={materials.PaletteMaterial001} />
          </group>
          {nodes['素白艺术™_-_subycnvip'] && (
            <mesh 
              name="素白艺术™_-_subycnvip" 
              geometry={nodes['素白艺术™_-_subycnvip'].geometry} 
              material={materials.PaletteMaterial002} 
              position={[-2.372, 15.102, -2.263]} 
              rotation={[-0.834, -0.414, -1.988]} 
              scale={0.037} 
            />
          )}
        </group>
      </group>

    </>
  )
})

export default AnimationAnalyzer