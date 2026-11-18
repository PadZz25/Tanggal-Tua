import { UI_STRINGS } from '../../domain/copy';
import type { MascotMood } from '../../domain/types';
import { Mascot } from './Mascot';

interface WordmarkProps {
  mood?: MascotMood;
}

export function Wordmark({ mood = 'smile' }: WordmarkProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Mascot mood={mood} size={32} />
      <span className="text-[18px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
        {UI_STRINGS.appName}
      </span>
    </div>
  );
}
