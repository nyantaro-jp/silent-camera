import { forwardRef } from 'react';

interface CameraViewProps {
  // フロントカメラ時はミラー表示にすると iOS 標準カメラ風になる
  mirrored?: boolean;
}

/**
 * <video> を fullscreen で表示する。playsinline / muted / autoplay は iOS Safari 必須。
 * stream の attach は親側が ref 経由で行う。
 */
export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  function CameraView({ mirrored = false }, ref) {
    return (
      <video
        ref={ref}
        className="cam-preview"
        playsInline
        autoPlay
        muted
        style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      />
    );
  },
);
