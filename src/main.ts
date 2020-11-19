import * as stream from 'stream';
import * as util from 'util';
import { setup } from './config';

// Function that recives through stdin a String, converts it to upper case and writes it throgh stdout.
// Using promisify-pipeline
const pipelinePromise = util.promisify(stream.pipeline);

/**
 * Async function to call pipelinePromise, program entrypoint.
 */
async function run() {
  // Load config params
  setup();
  // Awaits pipelinePromise to finish
  await pipelinePromise(
    // Read stdin
    process.stdin,
    // Transform data from stdin
    new stream.Transform({
      objectMode: true,
      transform: (chunk, _0, callback) => {
        try {
          const data = chunk.toString().toUpperCase();
          callback(null, data);
        } catch (e) {
          callback(e);
        }
      },
    }),
    process.stdout,
  );
}

// As run is async, we can use .catch to handling errors and .then if code is succeed.
run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
