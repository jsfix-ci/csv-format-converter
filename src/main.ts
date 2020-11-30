import * as stream from 'stream';
import * as util from 'util';
import { ConfigurationFile, setup } from './config';
import * as csvParse from 'csv-parse';
import * as csvStringify from 'csv-stringify';
import * as moment from 'moment';

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
  // Map instance that matches the name of each column with his column_type and if it's nullable
  const schemaMap = new Map();
  for (const schema of options.configFile.schema) {
    schemaMap.set(schema.column_name, schema);
  }
  // Awaits pipelinePromise to finish
  await pipelinePromise(
    // Read stdin
    process.stdin,
    csvParse({
      // If input data have header omits that first line
      from_line: options.configFile.input.header ? 2 : 1,
      columns: jsonColumns,
      delimiter: options.configFile.input.separator,
      encoding: options.configFile.input.encoding,
    }),
    /**
     * Transforms all data rows.
     */
    new stream.Transform({
      objectMode: true,
      transform: (chunk, _0, callback) => {
        try {
          const transformedChunk = CsvTransform(chunk, options.configFile, schemaMap);
          callback(null, transformedChunk);
        }catch (e) {
          callback(e);
        }
      },
    }),
    csvStringify({
      columns: jsonColumns,
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
 * Function that recives a Json ConfigFile and returns all column names
 * introduced by user.
 * @param {ConfigurationFile} configFile - Json configuration file
 * @return {columns}
 */
function createColumns(configFile: ConfigurationFile): string[] {
  const columns: string[] = [];
  for (let i = 0; i < configFile.schema.length; i += 1) {
    columns[i] = configFile.schema[i].column_name;
  }
  return columns;
}

/**
 * Function that recives each row from csv, user's Json config file and a schema map and
 * transforms all data to the correct types specified by user.
 * @param {*} csvRow - Each csv row
 * @param {ConfigurationFile} configFile - Json configuration file
 * @param {Map} schemaMap - Schema map
 * @return {csvRow} - Returns modified data row
 */
function CsvTransform(csvRow: any, configFile: ConfigurationFile, schemaMap: Map<string, any>) {
  // Identifies each data in a row and gets the properties of each data column.
  for (const column in csvRow) {
    const csvData = csvRow[column];
    const columnProp = schemaMap.get(column);
    const columnDataType = columnProp.data_type;
    const dataTypes: any = {
      string : dataToString,
      integer : dataToInteger,
      float : dataToFloat,
      date : dataToDate,
      datetime : dataToDateTime,
      boolean : dataToBool,
    };
    let data;
    // Checks if column is Nullable and csvData is nulls_encoded_as.
    if (columnProp.nullable && csvData === configFile.input.nulls_encoded_as) {
      data = null;
    } else if (!columnProp.nullable && csvData === configFile.input.nulls_encoded_as) {
      throw new Error(`Data on column ${columnProp.column_name} can't be null`);
    } else {
      // Each csv data is parsed to specified column type.
      for (const key in dataTypes) {
        if (key === columnDataType) {
          const validateData = dataTypes[key];
          data = validateData(csvData, columnProp, configFile);
        }
      }
      // Transform each data with javaScript correct types.
      csvRow[column] = data;
    }
  }
  return csvRow;
}
/**
 * Checks if data is a String and returns a String.
 * @param {string} data - Each csv data.
 * @param {*} columnProp - Column properties
 * @return {string}
 */
function dataToString(data: string, columnProp: any): string {
  const regexp = 	/^.*$/;
  if (!regexp.test(data)) {
    throw new Error(`Data in column ${columnProp.column_name} is not a valid string`);
  }
  return data;
}

/**
 * Checks if data is an Integer and returns a Number with Integer properties
 * @param {string} data - Each csv data.
 * @param {*} columnProp - Column properties
 * @return {number} - data parsed to Number
 */
function dataToInteger(data: string, columnProp: any): number {
  const regexp = /^([+-]?[1-9]\d*|0)$/;
  if (!regexp.test(data)) {
    throw new Error(`Data in column ${columnProp.column_name} is not an integer`);
  }
  const integer = Number(data);
  return integer;
}

/**
 * Checks if data is a Float and returns a Number with Float properties
 * @param {string} data - Each csv data.
 * @param {*} columnProp - Column properties
 * @return {number} - data parsed to Number
 */
function dataToFloat(data: string, columnProp: any): number {
  const regexp = /\b\d+\b/;
  if (!regexp.test(data)) {
    throw new Error(`Data in column ${columnProp.column_name} is not a float`);
  }
  const float = Number(+data);
  return float;
}

/**
 * Checks if data has correct time format and returns String
 * @param {string} data - Each csv data.
 * @param {ConfigurationFile} configFile - Json configuration file (to validate format)
 * @param {*} columnProp - Column properties
 * @return {string} - data
 */
function dataToDate(data: string, columnProp: any, configFile: ConfigurationFile): string {
  if (!moment(data, configFile.input.date_format, true).isValid()) {
    throw new Error(`Data in column ${columnProp.column_name} is not a valid date format`);
  }
  return data;
}

/**
 * Checks if data has correct time format and returns String
 * @param {string} data - Each csv data.
 * @param {*} columnProp - Column properties
 * @param {ConfigurationFile} configFile - Json configuration file (to validate format)
 * @return {string} - data
 */
function dataToDateTime(data: string, columnProp: any, configFile: ConfigurationFile): string {
  if (!moment(data, configFile.input.datetime_format, true).isValid()) {
    throw new Error(`Data in column ${columnProp.column_name} is not a valid datetime format`);
  }
  return data;
}

/**
 * Checks if data is a boolean as specified in Json config file. Returns a boolean.
 * NOTE: It seems that csvStringify parses booleans to 1 (true) or 0/"" (false) so keep in mind on output.
 * @param {string} data - Each csv data.
 * @param {*} columnProp - Column properties
 * @param {ConfigurationFile} configFile - Json configuration file (to validate format)
 * @return {boolean}
 */
function dataToBool(data: string, columnProp: any, configFile: ConfigurationFile): boolean {
  const regexp = new RegExp(`^(${configFile.input.false_encoded_as}|${configFile.input.true_encoded_as})$`);
  if (!regexp.test(data)) {
    throw new Error(`Data in column ${columnProp.column_name} is not Boolean`);
  }
  if (data === configFile.input.false_encoded_as) {
    return false;
  }
  return true;
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
