import * as stream from 'stream';
import * as util from 'util';
import { ConfigurationFile, Column, CSVFormat, setup, Options } from './config';
import * as csvParse from 'csv-parse';
import * as csvStringify from 'csv-stringify';
import * as moment from 'moment';

// Using promisify-pipeline
const pipelinePromise = util.promisify(stream.pipeline);

interface DynamicObject<T = any> {
  [key: string]: T;
}

type Parser = (
  value: string,
  columnName: string,
  inputConfig: CSVFormat,
  outputConfig: CSVFormat,
  ) => string | number;

/**
 * Async function to call pipelinePromise, program entrypoint.
 */
export async function run(options: Options = setup(),
                          inputStream: stream.Readable = process.stdin,
                          outputStream: stream.Writable = process.stdout) {
  // Load config params
  const jsonColumns = createColumns(options.configFile);
  // Map instance that matches the name of each column with its data_type and if it's nullable
  const schemaMap = new Map<string, Column>();
  let schema: Column;
  for (schema of options.configFile.schema) {
    schemaMap.set(schema.column_name, schema);
  }
  // Awaits pipelinePromise to finish
  await pipelinePromise(
    // Read inputStream
    inputStream,
    csvParse.parse({
      // If input data have header omits that first line
      from_line: options.configFile.input.header ? 2 : 1,
      columns: jsonColumns,
      delimiter: options.configFile.input.separator,
      encoding: options.configFile.input.encoding,
      escape: options.configFile.input.escape,
    }),
    /**
     * Transforms all data rows.
     */
    new stream.Transform({
      objectMode: true,
      transform: (chunk, _0, callback) => {
        try {
          const transformedChunk = inputCsvRowTransform(chunk, options.configFile, schemaMap);
          callback(null, transformedChunk);
        }catch (e) {
          callback(e);
        }
      },
    }),
    csvStringify({
      columns: jsonColumns,
      delimiter: options.configFile.output.separator,
      escape: options.configFile.output.escape,
      header: options.configFile.output.header,
      quote: options.configFile.output.enclosing.characters,
      quoted: options.configFile.output.enclosing.strict,
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
    outputStream,
  );
}

/**
 * Function that receives a Json ConfigFile and returns all column names
 * introduced by user.
 * @param {ConfigurationFile} configFile - Json configuration file
 * @return {columns}
 */
export function createColumns(configFile: ConfigurationFile): string[] {
  const columns: string[] = [];
  for (let i = 0; i < configFile.schema.length; i += 1) {
    columns[i] = configFile.schema[i].column_name;
  }
  return columns;
}

/**
 * Function that receives each row from csv, user's Json config file and a schema map and
 * transforms all data to the correct types specified by user.
 * @param {DynamicObject} csvRow - Each csv row
 * @param {ConfigurationFile} configFile - Json configuration file
 * @param {Map} schemaMap - Schema map
 * @return {csvRow} - Returns modified data row
 */
export function inputCsvRowTransform(csvRow: DynamicObject, configFile: ConfigurationFile, schemaMap: Map<string, any>) {
  // Identifies each data in a row and gets the properties of each data column.
  for (const column in csvRow) {
    const csvData = csvRow[column];
    const columnProp = schemaMap.get(column);
    const columnDataType = columnProp.data_type;
    const dataTypes: DynamicObject<Parser> = {
      string : dataToString,
      integer : dataToInteger,
      float : dataToFloat,
      date : dataToOutputDateFormat,
      datetime : dataToOutputDatetimeFormat,
      boolean : dataToOutputBoolEncodedAs,
    };
    let data: any;
    // Checks if column is Nullable and csvData is nulls_encoded_as.
    if (columnProp.nullable && csvData === configFile.input.nulls_encoded_as) {
      // Transforms null values as Output nulls_encoded_as format.
      data = configFile.output.nulls_encoded_as;
    } else if (!columnProp.nullable && csvData === configFile.input.nulls_encoded_as) {
      throw new Error(`Data on column ${columnProp.column_name} can't be null`);
    } else {
      // Each csv data is parsed to specified column type.
      const parseData = dataTypes[columnDataType];
      data = parseData(csvData, columnProp.column_name, configFile.input, configFile.output);
    }
    // Transform each data with javaScript correct types.
    csvRow[column] = data;
  }
  return csvRow;
}
/**
 * Checks if data is a String and returns a String.
 * @param {string} data - Each csv data.
 * @return {string}
 */
export function dataToString(data: string): string {
  return data;
}

/**
 * Checks if data is an Integer and returns a Number with Integer properties
 * @param {string} data - Each csv data.
 * @param {string} column_name - Column name
 * @return {number} - data parsed to Number
 */
export function dataToInteger(data: string, column_name: string): number {
  const regexp = /^([+-]?[1-9]\d*|0)$/;
  if (!regexp.test(data)) {
    throw new Error(`${data} in column ${column_name} is not an integer`);
  }
  return Number(data);
}

/**
 * Checks if data is a Float and returns a Number with Float properties
 * @param {string} data - Each csv data.
 * @param {string} column_name - Column name
 * @return {number} - data parsed to Number
 */
export function dataToFloat(data: string, column_name: string): number {
  const regexp = /^[+-]?([0-9]*[.])?[0-9]+$/;
  if (!regexp.test(data)) {
    throw new Error(`${data} in column ${column_name} is not a float`);
  }
  return Number(data);
}

/**
 * Checks if data has correct time format and returns a string containing the date with the csvOutput.date_format format
 * @param {string} data - Each csv data.
 * @param {CSVFormat} csvInput - Input CSV format declared by user in Configuration File (if user doesn't declare it
 * it takes default format specified in Json Schema).
 * @param {CSVFormat} csvOutput - Output CSV format declared by user in Configuration File (if user doesn't declare it
 * it takes default format specified in Json Schema).
 * @param {string} column_name - Column name
 * @return {string} - data with the csvOutput.date_format format
 */
export function dataToOutputDateFormat(data: string, column_name: string, csvInput: CSVFormat, csvOutput: CSVFormat): string {
  if (!moment.utc(data, csvInput.date_format, true).isValid()) {
    throw new Error(`${data} in column ${column_name} is not a valid date`);
  }
  return moment.utc(data, true).format(csvOutput.date_format);
}

/**
 * Checks if data has correct time format and returns a string containing the date with the csvOutput.datetime_format format
 * @param {string} data - Each csv data.
 * @param {string} column_name - Column name
 * @param {CSVFormat} csvInput - Input CSV format declared by user in Configuration File (if user doesn't declare it
 * it takes default format specified in Json Schema).
 * @param {CSVFormat} csvOutput - Output CSV format declared by user in Configuration File (if user doesn't declare it
 * it takes default format specified in Json Schema).
 * @return {string} - data with the csvOutput.datetime_format format
 */
export function dataToOutputDatetimeFormat(data: string, column_name: string, csvInput: CSVFormat, csvOutput: CSVFormat): string {
  if (!moment.utc(data, csvInput.datetime_format, true).isValid()) {
    throw new Error(`${data} in column ${column_name} is not a valid datetime`);
  }
  return moment.utc(data, true).format(csvOutput.datetime_format);
}

/**
 * Checks if data is a boolean as specified in Json config file. Returns values specified in Config File for booleans.
 * NOTE: It seems that csvStringify parses booleans to 1 (true) or 0/"" (false) so keep in mind on output.
 * @param {string} data - Each csv data.
 * @param {string} column_name - Column name
 * @param {CSVFormat} csvInput - Input Json format declared by user in Configuration File (if user doesn't declare it
 * it takes default format specified in Json Schema).
 * @param {CSVFormat} csvOutput - Output Json format declared by user in Configuration File (if user doesn't declare it
 * it takes default format specified in Json Schema).
 * @return {string}
 */
export function dataToOutputBoolEncodedAs(data: string, column_name: string, csvInput: CSVFormat, csvOutput: CSVFormat): string {
  if (data !== csvInput.true_encoded_as && data !== csvInput.false_encoded_as) {
    throw new Error(`${data} in column ${column_name} is not Boolean`);
  }else if (data === csvInput.false_encoded_as) {
    return csvOutput.false_encoded_as;
  } else {
    return csvOutput.true_encoded_as;
  }
}
