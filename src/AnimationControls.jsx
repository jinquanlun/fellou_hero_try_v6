import React from 'react'

/**
 * 动画控制面板组件
 */
function AnimationControls({ 
  onPlay, 
  onStop, 
  onPause,
  isPlaying, 
  currentTime, 
  animationInfo,
  position = [20, 20] 
}) {
  const totalDuration = animationInfo?.totalDuration || 0
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div style={{
      position: 'fixed',
      top: position[1],
      right: position[0],
      background: 'rgba(0, 0, 0, 0.9)',
      color: '#00ff00',
      padding: '20px',
      borderRadius: '10px',
      border: '1px solid #00ff00',
      fontFamily: 'monospace',
      fontSize: '12px',
      minWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#00ffff' }}>
        🎬 Animation Controls
      </h3>
      
      {/* 播放控制 */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={onPlay}
          disabled={isPlaying}
          style={{
            background: isPlaying ? '#333' : '#003300',
            border: '1px solid #00ff00',
            color: isPlaying ? '#666' : '#00ff00',
            padding: '8px 16px',
            marginRight: '10px',
            borderRadius: '4px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace'
          }}
        >
          ▶️ Play
        </button>
        
        <button 
          onClick={onPause}
          disabled={!isPlaying}
          style={{
            background: !isPlaying ? '#333' : '#333300',
            border: '1px solid #ffff00',
            color: !isPlaying ? '#666' : '#ffff00',
            padding: '8px 16px',
            marginRight: '10px',
            borderRadius: '4px',
            cursor: !isPlaying ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace'
          }}
        >
          ⏸️ Pause
        </button>
        
        <button 
          onClick={onStop}
          style={{
            background: '#330000',
            border: '1px solid #ff0000',
            color: '#ff0000',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace'
          }}
        >
          ⏹️ Stop
        </button>
      </div>

      {/* 时间显示 */}
      <div style={{ marginBottom: '15px' }}>
        <div>Time: {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s</div>
        <div style={{ 
          width: '100%', 
          height: '6px', 
          background: '#333', 
          borderRadius: '3px',
          marginTop: '5px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#00ff00',
            transition: 'width 0.1s'
          }} />
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>
          Progress: {progress.toFixed(1)}%
        </div>
      </div>

      {/* 动画信息 */}
      {animationInfo && (
        <div>
          <h4 style={{ margin: '0 0 10px 0', color: '#ffff00' }}>
            📊 Multi-Source Animation Info
          </h4>
          
          {/* 相机动画信息 */}
          {animationInfo.camera && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#00ffff' }}>
                📹 Camera: {animationInfo.camera.name}
              </div>
              <div style={{ fontSize: '10px', marginLeft: '10px' }}>
                Duration: {animationInfo.camera.duration.toFixed(2)}s
              </div>
              <div style={{ fontSize: '10px', marginLeft: '10px' }}>
                Tracks: {animationInfo.camera.tracks}
              </div>
            </div>
          )}
          
          {/* 环动画信息 */}
          {animationInfo.rings && Array.isArray(animationInfo.rings) && animationInfo.rings.length > 0 && (
            <div>
              <div style={{ color: '#00ff88', marginBottom: '8px' }}>
                🎯 Rings ({animationInfo.rings.length}/3):
              </div>
              {(animationInfo.rings || []).map((ring, index) => (
                <div key={ring.id} style={{ 
                  marginBottom: '8px',
                  marginLeft: '10px',
                  fontSize: '10px'
                }}>
                  <div style={{ color: ring.hasAnimation ? '#00ff00' : '#ff6600' }}>
                    {ring.hasAnimation ? '✅' : '⚠️'} {ring.id}: {ring.name}
                  </div>
                  {ring.hasAnimation && (
                    <>
                      <div style={{ marginLeft: '10px' }}>
                        Duration: {ring.duration.toFixed(2)}s
                      </div>
                      <div style={{ marginLeft: '10px' }}>
                        Tracks: {ring.tracks}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div style={{ 
            borderTop: '1px solid #333', 
            paddingTop: '8px', 
            marginTop: '12px',
            fontSize: '10px'
          }}>
            Total Duration: {totalDuration.toFixed(2)}s
          </div>
        </div>
      )}

      {/* 状态指示器 */}
      <div style={{
        marginTop: '15px',
        padding: '8px',
        background: isPlaying ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 165, 0, 0.1)',
        border: `1px solid ${isPlaying ? '#00ff00' : '#ffa500'}`,
        borderRadius: '4px',
        fontSize: '10px'
      }}>
        Status: {isPlaying ? '▶️ Playing' : '⏸️ Stopped'}
      </div>
    </div>
  )
}

export default AnimationControls