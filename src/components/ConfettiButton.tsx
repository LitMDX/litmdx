import confetti from 'canvas-confetti';
import { useRef } from 'react';

type ConfettiButtonProps = {
  label?: string;
};

export function ConfettiButton({ label = '🎉 Launch confetti' }: ConfettiButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
    const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5;

    void confetti({
      particleCount: 120,
      spread: 70,
      origin: { x, y },
    });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors duration-150 hover:bg-gray-100 dark:border-white/10 dark:bg-neutral-900 dark:text-gray-100 dark:hover:bg-neutral-800"
    >
      {label}
    </button>
  );
}
