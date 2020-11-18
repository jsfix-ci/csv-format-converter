import { env } from '@trans/config';
import * as fs from 'fs';
import { checkConfigFile } from './ajv-validator';

/**
 * Module that works with arguments given to the program through console.
 */

// Loads .env param.
env.load();

/**
 * CSV Format Interface
 */
interface CSVFormat {
  separator?: string; // "," by default
  header?: boolean; // True by default
  nulls_encoded_as?: string; // "" by default
  true_encoded_as?: string; // '1' by default
  false_encoded_as?: string; // '0' by default
  encoding?: string; // UTF-8 by default
  enclosing?: {
    characters?: string; // '"' by default
    avoid_for_numbers?: boolean; // False by default
    avoid_for_booleans?: boolean; // False by default
  };
  date_format?: string; // 'YYYY-MM-DD' by default
  datetime_format?: string; // Using toISOString() by default, eg "2020-10-23T08:29:42.695Z"
}

/**
 * Interface that takes available options
 */
export interface Options {
  configFile: ConfigurationFile;
}

/**
 * Client Arguments
 */
const cliArguments = [
  {
    name: 'config-file',
    type: String,
    description: 'Json file path',
  },
];

/**
 * Available options
 */
const options = env.getArguments(cliArguments, process.argv, {
  handleHelp: true,
  handleUnknown: true,
});

/**
 * Function that add command and validates Json given from user.
 * @return {Options} - Available options
 */
export function setup(): Options {
  const configPath: string = options['config-file'];
  // User's Json
  const userData = fs.readFileSync(configPath, { encoding: 'utf-8' });
  const configFile: ConfigurationFile = JSON.parse(userData);
  // Checks if given Json is valid.
  checkConfigFile(configFile);
  const scriptParameters: Options = {
    configFile,
  };
  return scriptParameters;
}

/**
 * Configuration File Interface
 */
export interface ConfigurationFile {
  schema: {
    column_name: string;
    data_type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean';
    nullable: boolean;
  }[];
  input: CSVFormat;
  output: CSVFormat;
}