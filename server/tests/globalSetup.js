/**
 * Runs once before the whole test run (in the main Vitest process).
 *
 * With MONGO_TEST_URI (e.g. a local Docker MongoDB or a CI service container) the tests use that
 * server. Otherwise a single in-memory MongoDB is started for the run and shared by every test
 * file; each file still gets its own database (see setup.js).
 */
export default async function setup(project) {
  const externalUri = process.env.MONGO_TEST_URI?.trim();
  if (externalUri) {
    project.provide('mongoUri', externalUri);
    return undefined;
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create();
  project.provide('mongoUri', server.getUri());

  return async () => {
    await server.stop();
  };
}
