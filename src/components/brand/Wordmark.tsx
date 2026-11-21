import { UI_STRINGS } from '../../domain/copy';
import type { MascotMood } from '../../domain/types';
import { Mascot } from './Mascot';

interface WordmarkProps {
  mood?: MascotMood;
  asHeading?: boolean;
}

export function Wordmark({ mood = 'smile', asHeading = false }: WordmarkProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Mascot mood={mood} size={32} />
      {asHeading ? (
        <h1 className="m-0 text-[18px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
          {UI_STRINGS.appName}
        </h1>
      ) : (
        <span className="text-[18px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
          {UI_STRINGS.appName}
        </span>
      )}
    </div>
  );
}
