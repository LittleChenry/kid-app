import { useEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';

interface Props {
  character: string;
}

export default function StrokeAnimationOverlay({ character }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !character) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const size = container.clientWidth || 300;

    const charDataLoader = (
      ch: string,
      onComplete: (data: { strokes: string[]; medians: number[][][] }) => void,
      onError: (err: any) => void,
    ) => {
      fetch(`/api/calligraphy/characters/${encodeURIComponent(ch)}`)
        .then(r => r.json())
        .then(data => {
          if (data?.hanziWriterData) {
            onComplete(JSON.parse(data.hanziWriterData));
          } else {
            onError(new Error('No hanzi-writer data'));
          }
        })
        .catch(onError);
    };

    const writer = HanziWriter.create(container, character, {
      width: size,
      height: size,
      padding: 5,
      showOutline: false,
      showCharacter: false,
      strokeColor: '#94a3b8',
      strokeWidth: 2,
      delayBetweenStrokes: 500,
      delayBetweenLoops: 2000,
      strokeAnimationSpeed: 1,
      charDataLoader,
    });

    writer.animateCharacter();

    return () => {
      container.innerHTML = '';
    };
  }, [character]);

  return <div ref={containerRef} className="w-full h-full" />;
}
