import { GitSourceProvider, isRemoteSource, type GitSourceOptions } from "./git-source.js";
import {
  FilesystemSourceProvider,
  type LoadOptions,
  type LoadedSource,
  type SourceProvider,
} from "./resolver.js";

class RoutingSourceProvider implements SourceProvider {
  private readonly filesystem = new FilesystemSourceProvider();
  private readonly git: GitSourceProvider;

  constructor(options: GitSourceOptions) {
    this.git = new GitSourceProvider(options);
  }

  load(source: string, options?: LoadOptions): Promise<LoadedSource> {
    return isRemoteSource(source) ? this.git.load(source, options) : this.filesystem.load(source, options);
  }

  dispose(): Promise<void> {
    return this.git.dispose();
  }
}

export function createSourceProvider(options: GitSourceOptions = {}): SourceProvider {
  return new RoutingSourceProvider(options);
}
