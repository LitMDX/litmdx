export { Callout } from './Callout';
export { Tabs, Tab } from './Tabs';
export { Steps } from './Steps';
export { Card, CardGrid } from './Card';
export { Badge } from './Badge';
export { CodeBlock } from './CodeBlock';
export { CodeGroup } from './CodeGroup';
export { Link } from './Link';
export { MdxImage } from './MdxImage';
import { Callout } from './Callout';
import { Tabs, Tab } from './Tabs';
import { Steps } from './Steps';
import { Card, CardGrid } from './Card';
import { Badge } from './Badge';
import { CodeBlock } from './CodeBlock';
import { CodeGroup } from './CodeGroup';
import { Link } from './Link';
import { MdxImage } from './MdxImage';
import { builtInComponents } from '../generated/built-in-components';
import { userComponents } from '../generated/user-components';

/**
 * Global component map injected into every MDX page.
 * Any MDX file can use <Callout>, <Tabs>, <Steps>, etc. without imports.
 * Heavy components (e.g. Mermaid) are included only when enabled in litmdx.config.ts.
 */
export const mdxComponents = {
  Callout,
  Tabs,
  Tab,
  Steps,
  Card,
  CardGrid,
  Badge,
  CodeBlock,
  CodeGroup,
  ...builtInComponents,
  pre: CodeBlock,
  a: Link,
  img: MdxImage,
  ...userComponents,
} as const;
