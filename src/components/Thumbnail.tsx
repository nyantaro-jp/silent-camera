import { useEffect, useState } from 'react';

interface Props {
  blob: Blob;
  onClick?: () => void;
  className?: string;
  alt?: string;
}

/** Blob → ObjectURL を作って <img> に流す。アンマウント時に revoke。 */
export function Thumbnail({ blob, onClick, className, alt = '撮影画像' }: Props) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url) return <div className={className} />;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={alt}>
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      </button>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}
