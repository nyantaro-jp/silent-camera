// MediaTrackCapabilities/Settings/ConstraintSet に zoom/torch を足す。
// W3C 標準の lib.dom.d.ts には未収録だが、Chrome / Android Chrome / 一部の iOS Safari は実装している。

declare global {
  interface MediaTrackCapabilities {
    zoom?: { min: number; max: number; step: number };
    torch?: boolean;
  }
  interface MediaTrackSettings {
    zoom?: number;
    torch?: boolean;
  }
  interface MediaTrackConstraintSet {
    zoom?: number | ConstrainDouble;
    torch?: boolean;
  }
}

export {};
