export { Callout } from './Callout';
export { Tabs, Tab } from './Tabs';
export { Steps } from './Steps';
export { Card, CardGrid } from './Card';
export { Badge } from './Badge';
export { CodeBlock } from './CodeBlock';
export { CodeGroup } from './CodeGroup';
export { Mermaid } from './Mermaid';
export { Link } from './Link';

import { Callout } from './Callout';
import { Tabs, Tab } from './Tabs';
import { Steps } from './Steps';
import { Card, CardGrid } from './Card';
import { Badge } from './Badge';
import { CodeBlock } from './CodeBlock';
import { CodeGroup } from './CodeGroup';
import { Mermaid } from './Mermaid';
import { Link } from './Link';

/**
 * Global component map injected into every MDX page.
 * Any MDX file can use <Callout>, <Tabs>, <Steps>, etc. without imports.
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
  Mermaid,
  pre: CodeBlock,
  a: Link,
} as const;
