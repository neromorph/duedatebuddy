declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
type JestMatchers = {
  not: JestMatchers;
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
};

declare const expect: (actual: unknown) => JestMatchers;
