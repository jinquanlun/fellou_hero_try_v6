# Complete 3D Animation System

This file provides guidance to Claude Code (claude.ai/code) when working with this 3D animation project.

## Project Overview

An elegant 3D animation system using React Three Fiber that recreates Blender animations with multi-source data. The system combines v6 model geometry with Scenes B animation data and Camera.glb movement for a complete synchronized experience.

## 🗂️ Project Structure

```
src/
├── components/           # React Components
│   ├── App.jsx          # Main application entry point
│   ├── CompleteAnimationScene.jsx  # Core animation scene orchestrator
│   ├── AnimatedCamera.jsx          # Camera animation system
│   └── AnimationControls.jsx       # UI control panel
├── systems/             # Core Systems
│   └── MultiSourceAnimationExtractor.js  # Multi-source animation extraction
└── main.jsx            # React application entry

public/                  # Optimized 3D Models (98% compressed)
├── Camera-transformed.glb           # Camera animation (7s duration)
├── LOST_cut2_v6-transformed.glb    # v6 model geometry (rings + art)
├── Scenes_B_00100-transformed.glb  # Ring 1 animation data
├── Scenes_B_0023-transformed.glb   # Ring 2 animation data
└── Scenes_B_00100.001-transformed.glb # Ring 3 animation data
```

## ⚙️ Core Architecture

### Multi-Source Animation System
- **Camera Animation**: Extracted from Camera-transformed.glb (position, rotation, FOV)
- **Ring Geometry**: v6 model provides optimized mesh geometry  
- **Ring Animation**: Scenes B models provide motion data (position, rotation, scale)
- **Synchronization**: All sources synchronized to 7-second timeline

### Key Components
- **MultiSourceAnimationExtractor**: Core system that loads and processes GLB animations
- **CompleteAnimationScene**: Main scene combining v6 geometry with Scenes B animations
- **AnimatedCamera**: Replaces OrbitControls with GLB-driven camera movement
- **AnimationControls**: Real-time playback controls with detailed animation info

## 🎬 Animation Features

### Visual Effects
- **Silk-smooth Transitions**: 1.5s ending transition using easeInOutCubic
- **Perfect Framing**: Camera automatically adjusts for optimal final composition
- **Scale Enhancement**: 50% ring enlargement at animation end
- **Staged Adjustments**: Position (0-70%) then rotation (30-100%) for natural movement

### Technical Features
- **DRACO Compression**: Efficient loading of compressed geometries
- **Time-based Interpolation**: Smooth keyframe interpolation with quaternion support
- **Error Handling**: Graceful fallbacks for missing animation data
- **Performance Optimized**: Minimal memory footprint, 98% file size reduction

## 🚀 Development Commands

```bash
npm run dev     # Start development server (localhost:3000)
npm run build   # Build for production
npm run preview # Preview production build

# Model optimization (if needed)
npx gltfjsx@6.5.3 [model.glb] --transform
```

## 🎯 Usage Pattern

```jsx
// Main application structure
<Canvas>
  <CompleteAnimationScene 
    ref={sceneRef}
    onAnimationInfoChange={setAnimationInfo}
    onPlayingChange={setIsPlaying}
    onTimeChange={setCurrentTime}
    onCameraUpdate={setCameraState}
  />
</Canvas>

// Control playback
sceneRef.current.playAnimation()
sceneRef.current.pauseAnimation()  
sceneRef.current.stopAnimation()
```

## 📦 Optimizations Achieved

- **File Size**: ~1.5GB → ~100MB (98% reduction)
- **Architecture**: Clean component/system separation
- **Performance**: Efficient DRACO decompression
- **Code Quality**: Removed debug logs, organized imports
- **Memory**: Eliminated unused files and dependencies

## 🎨 Animation Timeline

- **0-5.5s**: Original Camera.glb and Scenes B animations play normally
- **5.5-7.0s**: Smooth transition begins - camera adjusts view, rings scale up
- **7.0s**: Perfect final frame - rings centered and enlarged for impact

This creates a cinematic experience that starts with the original Blender animation and culminates in an optimized final composition.