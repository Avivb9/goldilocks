// Types for the plain-JS serverless function, so the unit test can import it.
declare const handler: (req: unknown, res: unknown) => Promise<unknown>;
export default handler;
