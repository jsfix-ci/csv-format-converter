import * as Main from '../src/main';
import { CSVFormat, ConfigurationFile, setup, Options } from '../src/config';
import { checkConfigFile } from '../src/ajv-validator';
import { Readable, Writable } from 'stream';
import { ReadStream } from 'fs';

describe('Data parsing function', () => {

  // dataToString is called properly
  test('dataToString behaves as identity function for strings', () => {
    expect(Main.dataToString('Some string')).toBe('Some string');
  });
  // dataToInteger checks correcly a valid Integer
  it('Should parse given string to integer', () => {
    expect(Main.dataToInteger('10', 'Integer Column')).toBe(10);
  });
  // dataToInteger throws an error when data is not a valid Integer
  it('Should throw an error, given string can not be parsed to integer', () => {
    expect(() => {
      Main.dataToInteger('10.1', 'Integer Column');
    }).toThrow();
  });
  // dataToFloat checks correcly a valid Float
  it('Should parse given string to a float', () => {
    expect(Main.dataToFloat('10.1', 'Float Column')).toBe(10.1);
  });
  // dataToFloat throws an error when data is not a valid Float
  it('Should throw an error, given string can not be parsed to float', () => {
    expect(() => {
      Main.dataToFloat('10.a1', 'Float Column');
    }).toThrow();
  });
  // dataToOutputDateFormat validates and transform dates correctly
  it('Should parse given date string to outputCSVFormat date_format', () => {
    const inputCSVFormat = {
      date_format: 'YYYY-MM-DD',
    }
    const outputCSVFormat = {
      date_format: 'DD/MM/YYYY',
    }
    expect(Main.dataToOutputDateFormat('2020-01-21', 'Date Column', inputCSVFormat as CSVFormat, outputCSVFormat as CSVFormat)).toBe('21/01/2020');
  });
  // dataToOutputDateFormat throws an error when data is not a valid date
  it('Should throw an error, given date string is not valid', () => {
    const inputCSVFormat = {
      date_format: 'YYYY-MM-DD',
    }
    const outputCSVFormat = {
      date_format: 'DD/MM/YYYY',
    }
    expect(() => {
      Main.dataToOutputDateFormat('21/01/2020', 'Date Column', inputCSVFormat as CSVFormat, outputCSVFormat as CSVFormat)
    }).toThrow();
  });
  // dataToOutputDatetimeFormat validates and transform dates correctly
  it('Should parse given datetime string to outputCSVFormat datetime_format', () => {
    const inputCSVFormat = {
      datetime_format: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    }
    const outputCSVFormat = {
      datetime_format: 'DD/MM/YYYY',
    }
    expect(Main.dataToOutputDatetimeFormat('2020-01-21T14:54:12.358+0000', 'Datetime Column', inputCSVFormat as CSVFormat, outputCSVFormat as CSVFormat)).toBe('21/01/2020');
  });
  // dataToOutputDatetimeFormat throws an error when data is not a valid date
  it('Should throw an error, given datetime string is not valid', () => {
    const inputCSVFormat = {
      date_format: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    }
    const outputCSVFormat = {
      date_format: 'DD/MM/YYYY',
    }
    expect(() => {
      Main.dataToOutputDatetimeFormat('21/01/2020', 'Datetime Column', inputCSVFormat as CSVFormat, outputCSVFormat as CSVFormat)
    }).toThrow();
  });
  // dataToOutputBoolEncodedAs transforms strings specified as boolean true values to outputCSVFormat true_encoded_as
  it('Should parse given string to outputCSVFormat true_encoded_as', () => {
    const inputCSVFormat = {
      true_encoded_as: 'true',
    }
    const outputCSVFormat = {
      true_encoded_as: '1',
    }
    expect(Main.dataToOutputBoolEncodedAs('true', 'Boolean Column', inputCSVFormat as CSVFormat, outputCSVFormat as CSVFormat)).toBe('1');
  })
  // dataToOutputBoolEncodedAs transforms strings specified as boolean false values to outputCSVFormat false_encoded_as
  it('Should parse given string to outputCSVFormat false_encoded_as', () => {
    const inputCSVFormat = {
      false_encoded_as: 'false',
    }
    const outputCSVFormat = {
      false_encoded_as: '0',
    }
    expect(Main.dataToOutputBoolEncodedAs('false', 'Boolean Column', inputCSVFormat as CSVFormat, outputCSVFormat as CSVFormat)).toBe('0');
  })
  // dataToOutputBoolEncodedAs throws an error when boolean value is not valid
  it('Should throw an error, given string is not equal to inputCSVFormat true_encoded_as or false_encoded_as', () => {
    const inputCSVFormat = {
      true_encoded_as: 'true',
      false_encoded_as:'false',
    }
    const outputCSVFormat = {
      true_encoded_as: '1',
      false_encoded_as: '0',
    }
    expect(() => {
      Main.dataToOutputBoolEncodedAs('1', 'Boolean Column', inputCSVFormat as CSVFormat, outputCSVFormat as CSVFormat)
    }).toThrow();
  })
});

// Checks function that parse data and function that takes column names from config file
describe('data parser and column names', () => {
  // inputCsvRowTransform parses null values
  it('Should transform null value', () => {
    const row = { Column1: '2.65', Column2: 'Any String', Column3: 'null' };
    const configFile = {
      schema: [{
        "column_name": "Column1",
        "data_type": "float",
        "nullable": true
      },
      {
        "column_name": "Column2",
        "data_type": "string",
        "nullable": true
      },
      {
        "column_name": "Column3",
        "data_type": "boolean",
        "nullable": true
      }],
      input: {
        nulls_encoded_as: "null"
      },
      output: {
        nulls_encoded_as: "this_is_null"
      }
  };
    const schemaMap: Map<string, any> = new Map([
      ["Column1", {data_type: "float", nullable: true}],
      ["Column2", {data_type: "string", nullable: true}],
      ["Column3", {data_type: "boolean", nullable: true}]
    ]);

    expect(Main.inputCsvRowTransform(row, configFile as ConfigurationFile, schemaMap as Map<string,any>))
    .toMatchObject({"Column1": 2.65, "Column2": "Any String", "Column3": "this_is_null"});
  })
  // inputCsvRowTransform throw an error when null value is not valid
  it('Should throw an error, column is not nullable and value in that column is null', () => {
    const row = { Column3: 'null' };
    const configFile = {
      schema: [{
        "column_name": "Column1",
        "data_type": "boolean",
        "nullable": false
      }],
      input: {
        nulls_encoded_as: "null"
      },
      output: {
        nulls_encoded_as: "this_is_null"
      }
  };
    const schemaMap: Map<string, any> = new Map([
      ["Column3", {data_type: "boolean", nullable: false}]
    ]);
    expect(() => {
      Main.inputCsvRowTransform(row, configFile as ConfigurationFile, schemaMap as Map<string,any>)
    }).toThrow();
  })
  // createColmns keeps Columns values given through configFile
  it('Should show column names given through configFile', () => {
    const row = { Column1: '2.65', Column2: 'Any String', Column3: 'null' };
    const configFile = {
      schema: [{
        "column_name": "Column1",
        "data_type": "float",
        "nullable": true
      },
      {
        "column_name": "Column2",
        "data_type": "string",
        "nullable": true
      },
      {
        "column_name": "Column3",
        "data_type": "boolean",
        "nullable": true
      }],
      input: {
        nulls_encoded_as: "null"
      },
      output: {
        nulls_encoded_as: "this_is_null"
      }
    };
    expect(Main.createColumns(configFile as ConfigurationFile)).toMatchObject(['Column1', 'Column2', 'Column3']);
  })
})

// checkConfigFile verifies given config file is valid
describe('Checks configuration file is valid and populates it with default values from JSON Schema', () => {
  it('Should validate configuration file and populates it with default values from JSON Schema', () => {
    const configData = {
      schema: [{
        "column_name": "Column1",
        "data_type": "float",
        "nullable": true
      },
      {
        "column_name": "Column2",
        "data_type": "string",
        "nullable": true
      },
      {
        "column_name": "Column3",
        "data_type": "boolean",
        "nullable": true
      }],
      input: {
        nulls_encoded_as: "null"
      },
      output: {
        nulls_encoded_as: "this_is_null"
      }
    }
    checkConfigFile(configData);
    expect(configData).toEqual({
      schema: [{
        "column_name": "Column1",
        "data_type": "float",
        "nullable": true
      },
      {
        "column_name": "Column2",
        "data_type": "string",
        "nullable": true
      },
      {
        "column_name": "Column3",
        "data_type": "boolean",
        "nullable": true
      }],
      input: {
        separator: ",",
        header: true,
        escape: "\\",
        nulls_encoded_as: "null",
        true_encoded_as: "1",
        false_encoded_as: "0",
        encoding: "UTF-8",
        enclosing:{
          characters : "\"",
          strict: true
        },
        date_format: "YYYY-MM-DD",
        datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
      },
      output: {
        separator: ",",
        header: true,
        escape: "\\",
        nulls_encoded_as: "this_is_null",
        true_encoded_as: "1",
        false_encoded_as: "0",
        encoding: "UTF-8",
        enclosing:{
          characters : "\"",
          strict: true
        },
        date_format: "YYYY-MM-DD",
        datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
      },
    });
  });
  // checkConfigFile throws an error if config file given is not valid
  it('Should throw an error, config file is not valid', () => {
    const configData = {
      schema: [{
        "column_name": "Column1",
        "data_type": "float",
        "nullable": true
      },
      {
        "column_name": "Column2",
        "data_type": "string",
        "nullable": true
      },
      {
        "column_name": "Column3",
        "data_type": "boolean",
        "nullable": true
      }],
      input: {
        true_encoded_as: "is true"
      },
      output: {
      }
    }
    
    expect(() => {
      checkConfigFile(configData);
    }).toThrowError();
  });
})

// setup function tests
describe('Checks initialization setup', () => {
  // setup returns an object with all key: value pairs in config file. If a value is not specified it will return defaul value.
  it('Should return an object with JSON keys: values', () => {
    expect(setup(['--config-file', 'test/my-conf.json'])).toEqual({
      configFile: {
        schema: [{
          "column_name": "Column1",
          "data_type": "float",
          "nullable": true
        },
        {
          "column_name": "Column2",
          "data_type": "string",
          "nullable": true
        },
        {
          "column_name": "Column3",
          "data_type": "boolean",
          "nullable": true
        }],
        input: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
        output: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
      }
    })
  })
  // setup returns an object with all key: value pairs in config file. If a value is not specified it will return defaul value.
  it('Should return an object with JSON keys: values (using process.argv branch)', () => {
    process.argv = ['node -r ts-node/register', 'test/dummy.ts', '--config-file', 'test/my-conf.json'];
    expect(setup()).toEqual({
      configFile: {
        schema: [{
          "column_name": "Column1",
          "data_type": "float",
          "nullable": true
        },
        {
          "column_name": "Column2",
          "data_type": "string",
          "nullable": true
        },
        {
          "column_name": "Column3",
          "data_type": "boolean",
          "nullable": true
        }],
        input: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
        output: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
      }
    })
  })
})

// run fuction tests
describe('Checks run function - program entrypoint', () => {
  // run transforms given values as expected
  it('Should transform given values to expected values with config file options by default', async () => {
    const options = {
      configFile: {
        schema: [{
          "column_name": "Column1",
          "data_type": "float",
          "nullable": true
        },
        {
          "column_name": "Column2",
          "data_type": "string",
          "nullable": true
        },
        {
          "column_name": "Column3",
          "data_type": "boolean",
          "nullable": true
        }],
        input: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
        output: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
      }
    }
    const data = Readable.from('a,b,c\n2.65,Peter,1\n2.03,Charles,0\n');
    const outData = new Writable();
    let out = '';
    outData._write = function(chunk,_0,callback){ 
      // Defining string 
      out += chunk.toString(); 
      callback();
    };
    await Main.run(options as Options, data, outData)
    expect(out)
      .toEqual('"Column1","Column2","Column3"\n"2.65","Peter","1"\n"2.03","Charles","0"\n')
  })
  // run throws an error while transforming values, data is not valid in column3 values.
  it('Should throw an error through stream.Transform that transforms data: data is not valid in Column3.', async () => {
    const options = {
      configFile: {
        schema: [{
          "column_name": "Column1",
          "data_type": "float",
          "nullable": true
        },
        {
          "column_name": "Column2",
          "data_type": "string",
          "nullable": true
        },
        {
          "column_name": "Column3",
          "data_type": "boolean",
          "nullable": true
        }],
        input: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
        output: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
      }
    }
    const data = Readable.from('a,b,c\n2.12,Peter,1\n2.03,Charles,%\n');
    const outData = new Writable();
    let out;
    outData._write = function(chunk,_0,callback){ 
      // Defining string 
      out += chunk.toString(); 
      callback();
    };
    await expect(Main.run(options as Options, data, outData)).rejects.toThrow();
  });
  // run throws an error while encoding values to ascii, data is not valid in column3 values.
  it('Should throw an error through stream.Transform that encodes data: data is not valid in Column3.', async () => {
    const options = {
      configFile: {
        schema: [{
          "column_name": "Column1",
          "data_type": "float",
          "nullable": true
        },
        {
          "column_name": "Column2",
          "data_type": "string",
          "nullable": true
        },
        {
          "column_name": "Column3",
          "data_type": "boolean",
          "nullable": true
        }],
        input: {
          separator: ",",
          header: false,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "UTF-8",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
        output: {
          separator: ",",
          header: true,
          escape: "\\",
          nulls_encoded_as: "",
          true_encoded_as: "1",
          false_encoded_as: "0",
          encoding: "ascii",
          enclosing:{
            characters : "\"",
            strict: true
          },
          date_format: "YYYY-MM-DD",
          datetime_format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
      }
    }
    const data = Readable.from('2.65,Peter,1\n2.03,CharlÈs,0\n');
    const outData = new Writable();
    await expect(Main.run(options as Options, data, outData)).rejects.toThrow();
  });
})
