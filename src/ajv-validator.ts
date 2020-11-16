import * as Ajv from 'ajv';
import * as userSchema from './schemas/config-file-schema.json';
import * as defsSchema from './schemas/csv-format-schema.json';
import * as fs from 'fs';

/**
 * Function that validates a Json through param with JsonSchema and returns this Json if it's valid.
 * If it's not valid, thorws an exception.
 * @param {string} path - Path to Json that must be validated.
 * @return {any} - Returns Json passed through param.
 */
export function checkConfigFile(path: string): object {
  const ajv = new Ajv();
  // Json from user
  const userData = fs.readFileSync(path, { encoding: 'utf-8' });
  const data = JSON.parse(userData);
  const validate = ajv.addSchema(defsSchema).compile(userSchema);
  const valid = validate(data);
  if (!valid && validate.errors) {
    let messages;
    for (const message of validate.errors) {
      messages = message.message;
    }
    throw new Error(messages);
  } else {
    // If it's valid, returns Json's data.
    return data;
  }
}
