declare module 'conventional-changelog' {
  interface Options {
    preset?: string;
    releaseCount?: number;
    from?: string;
    to?: string;
  }

  function conventionalChangelog(options?: Options): NodeJS.ReadableStream;
  export default conventionalChangelog;
}