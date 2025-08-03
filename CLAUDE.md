# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains React Three.js components for 3D scene rendering. All JSX files are auto-generated from GLTF models using the `gltfjsx` tool, which optimizes large 3D model files for web use.

## Development Commands

### Model Conversion
```bash
npx gltfjsx@6.5.3 [model.glb] --transform
```
This command converts original GLTF files to optimized versions with significant size reduction (typically 95%+ compression). The transformed files are used by the JSX components.

## Architecture

### Component Structure
- Each `.jsx` file exports a `Model` component that renders 3D meshes
- Uses `@react-three/drei` library for 3D utilities (`useGLTF`, `useAnimations`, `PerspectiveCamera`)
- Components are designed to be imported and used within a React Three Fiber scene

### Key Dependencies
- `react` - Core React library
- `@react-three/drei` - React Three.js utilities for GLTF loading and animations

### Material System
- All 3D models use a consistent material palette:
  - `PaletteMaterial001` - Primary material
  - `PaletteMaterial002` - Secondary material

## File Organization

```
/
├── original_model/          # Original GLB files (large, unoptimized)
├── *-transformed.glb        # Optimized GLB files used by components
├── *.jsx                    # React components for 3D models
```

## 3D Scene Components

- **Camera.jsx** - Perspective camera setup with predefined position and rotation
- **LOST_cut2_v6.jsx** - Complex multi-scene composition with multiple grouped meshes
- **Scenes_B_00100.jsx** - Individual scene component
- **Scenes_B_0023.jsx** - Individual scene component  
- **001.jsx** - Scene component based on Scenes_B_00100.001 model

### Component Usage Pattern
```jsx
import { Model } from './ComponentName.jsx'

// Use within a React Three Fiber Canvas
<Model />
```

## Model Optimization

Original GLTF files (hundreds of MB) are transformed to optimized versions (single-digit MB) using the gltfjsx transform option. This dramatically improves loading performance while maintaining visual quality.