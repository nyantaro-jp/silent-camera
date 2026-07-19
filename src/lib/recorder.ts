// MediaRecorder ラッパー。動画も音声トラック無し (audio:false のストリームをそのまま録画)
// なので完全無音の方針はそのまま。マイク権限も要求しない。

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface RecorderHandle {
  /** 録画を終了し、完成した動画 Blob を返す */
  stop: () => Promise<RecordingResult>;
  /** 保存せずに破棄する (画面遷移時などの後始末用) */
  discard: () => void;
}

// iOS Safari (14.3+) は mp4、Chrome/Edge は webm が主。
// mp4 を優先するのは「iOS の写真アプリにそのまま保存できる」「再生互換が広い」ため。
// Chrome も 126 あたりから mp4 録画に対応している。
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=h264',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

export function pickMimeType(): string | undefined {
  if (!isRecordingSupported()) return undefined;
  for (const c of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  // 空 = ブラウザのデフォルトに任せる
  return undefined;
}

/**
 * 録画を開始する。stop() を呼ぶまで chunk を蓄積し続ける。
 * MediaRecorder は stream の生死に依存するので、録画中に track.stop() すると
 * 自動的に onstop が走る (その場合も stop() の Promise は解決する)。
 */
export function startRecording(stream: MediaStream): RecorderHandle {
  if (!isRecordingSupported()) {
    throw new Error('このブラウザは動画録画 (MediaRecorder) に対応していません');
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let discarded = false;

  recorder.addEventListener('dataavailable', (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  // 1 秒ごとに chunk を切ることで、長時間録画でも stop 時の一括処理を避ける
  recorder.start(1000);

  const stop = (): Promise<RecordingResult> =>
    new Promise((resolve, reject) => {
      const finalize = () => {
        if (discarded) {
          reject(new Error('録画は破棄されました'));
          return;
        }
        const type = recorder.mimeType || mimeType || 'video/webm';
        // codecs パラメータを落とした素の MIME を Blob に付ける
        const bareType = type.split(';')[0];
        resolve({
          blob: new Blob(chunks, { type: bareType }),
          mimeType: bareType,
          durationMs: Date.now() - startedAt,
        });
      };
      if (recorder.state === 'inactive') {
        finalize();
        return;
      }
      recorder.addEventListener('stop', finalize, { once: true });
      recorder.stop();
    });

  const discard = () => {
    discarded = true;
    chunks.length = 0;
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* already stopping */
      }
    }
  };

  return { stop, discard };
}

/** 経過時間の mm:ss 表示 */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
