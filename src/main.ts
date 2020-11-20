import * as stream from 'stream';
import * as util from 'util';
import { ConfigurationFile, setup } from './config';
import * as csvParse from 'csv-parse';
import * as csvStringify from 'csv-stringify';

// Function that recives through stdin a String, converts it to upper case and writes it throgh stdout.
// Using promisify-pipeline
const pipelinePromise = util.promisify(stream.pipeline);

/**
 * Async function to call pipelinePromise, program entrypoint.
 */
async function run() {
  // Load config params
  const options = setup();
  const jsonColumns = createColumns(options.configFile);
  // Awaits pipelinePromise to finish
  await pipelinePromise(
    // Read stdin
    process.stdin,
    csvParse({
      columns: (() => jsonColumns),
      delimiter: options.configFile.input.separator,
      encoding: options.configFile.input.encoding,
    }),
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
    csvStringify({
      delimiter: options.configFile.output.separator,
      header: options.configFile.output.header,
    }),
    /**
     * Encoding data transform.
     */
    new stream.Transform({
      transform: (chunk, _0, callback) => {
        try {
          const encode = Buffer
            .from(chunk, options.configFile.input.encoding as BufferEncoding)
            .toString(options.configFile.output.encoding as BufferEncoding);
          callback(null, encode);
        }catch (e) {
          callback(e);
        }
      },
    }),
    process.stdout,
  );
}

/**
 * Function that recives a Json ConfigFile and returns all column names.
 * introduced by user
 *  * @param {ConfigurationFile} configFile - Json configuration file
 * @return {columns}
 */
function createColumns(configFile: ConfigurationFile): string[] {
  const columns: string[] = [];
  for (let i = 0; i < configFile.schema.length; i += 1) {
    columns[i] = configFile.schema[i].column_name;
  }
  return columns;
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
