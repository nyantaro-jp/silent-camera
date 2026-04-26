/** 三分割線オーバーレイ。タッチを通過させる必要があるので pointer-events: none。 */
export function Grid() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      <div className="absolute left-1/3 top-0 h-full border-l border-white/30" />
      <div className="absolute left-2/3 top-0 h-full border-l border-white/30" />
      <div className="absolute top-1/3 left-0 w-full border-t border-white/30" />
      <div className="absolute top-2/3 left-0 w-full border-t border-white/30" />
    </div>
  );
}
