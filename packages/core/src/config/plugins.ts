// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any;

export interface ResolvedPlugins {
  remarkPlugins: AnyPlugin[];
  rehypePlugins: AnyPlugin[];
}

export interface PluginsConfig {
  remarkPlugins?: AnyPlugin[];
  rehypePlugins?: AnyPlugin[];
}
