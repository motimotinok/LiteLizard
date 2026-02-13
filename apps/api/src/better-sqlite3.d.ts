declare module 'better-sqlite3' {
  interface Statement {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  }

  interface Database {
    pragma: (query: string) => unknown;
    exec: (query: string) => void;
    prepare: (query: string) => Statement;
    close: () => void;
  }

  const BetterSqlite3: {
    new (filename: string): Database;
  };

  export default BetterSqlite3;
  export { Database, Statement };
}
