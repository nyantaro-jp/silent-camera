interface Props {
  seconds: number;
  onCancel: () => void;
}

/** タイマー撮影中のカウントダウン表示。中央に大きい数字 + キャンセル。 */
export function CountdownOverlay({ seconds, onCancel }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40">
      <span className="text-[180px] font-bold leading-none text-white tabular-nums drop-shadow-lg">
        {seconds}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="mt-12 rounded-full bg-white px-6 py-2 text-base font-semibold text-black active:scale-95"
      >
        キャンセル
      </button>
    </div>
  );
}
