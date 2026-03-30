import type { ReactNode } from 'react';

interface StepsProps {
  children: ReactNode;
}

/**
 * Wraps content that uses ### headings as numbered steps.
 *
 * @example
 * <Steps>
 * ### Install
 * Run `npm install litmdx`
 *
 * ### Configure
 * Create a `litmdx.config.ts` file
 * </Steps>
 */
export function Steps({ children }: StepsProps) {
  return <div className="litmdx-steps my-5">{children}</div>;
}
