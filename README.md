# CSV format converter

## Description

Converts between different formats in CSV files using standard input and standard output.

It makes the CSV formats obtained from different databases and used when importing data to different databases compatible with each other.

For example, with this tool, you will be able to export a CSV file from PostgreSQL and import it to Clickhouse without having to code a specific conversion logic.

## How it works

It receives the input data from `stdin` and outputs the resulting transformation to `stdout`.

It receives a configuration parameter `--config-file` that will define which types of transformations you want to apply. The configuration file will contain a JSON object that will have to meet the following interface:

```ts
interface ConfigurationFile {
  schema: {
    column_name: string;
    data_type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean';
    nullable: boolean;
  }[];
  input: CSVFormat;
  output: CSVFormat;
}

interface CSVFormat {
  separator?: string; // "," by default
  header?: boolean; // True by default
  nulls_encoded_as?: string; // "" by default
  true_encoded_as?: string; // '1' by default
  false_encoded_as?: string; // '0' by default
  encoding?: string; // UTF-8 by default
  enclosing?: {
    characters?: string; // '"' by default
    strict?: boolean // true by default
  };
  date_format?: string; // 'YYYY-MM-DD' by default
  datetime_format?: string; // Using toISOString() by default, eg "2020-10-23T08:29:42.695Z"
}
```
For details on ```date_format``` and ```datetime_format``` see Moment.js doc: https://momentjs.com/docs/#/displaying/format/

## Configuration file

This Json file is an example of configuration file with default values. "schema" array must contain a number of objects equivalent to the amount of columns, the type of each column and if each column is nullable in csv provided.

```json
{
    "schema":[
        {
            "column_name": "Column1",
            "data_type": "string",
            "nullable": true
        }
    ],
    "input": {
        "separator": ",",
        "header": true,
        "escape": "\\",
        "nulls_encoded_as": "",
        "true_encoded_as": "1",
        "false_encoded_as": "0",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": true
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\\",
        "nulls_encoded_as": "",
        "true_encoded_as": "1",
        "false_encoded_as": "0",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": true
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    }
}
```

## Usage examples

```bash
my-file.csv | npx @trans/csv-format-converter --config-file my-conf.json | clickhouse-client --query="INSERT INTO my_table FORMAT CSVWithNames"
```

### Json examples to import to Clickhouse

IMPORTANT WHEN INSERTING TO CLICKHOUSE

This table shows null values that Clickhouse accepts when importing data to an integer or a float column types.

| null_encoded_as  | integer | float |
| ------------- | ------------- | ------------- |
| \N  | OK | OK  |
| null  | NO  | NO  |
| NULL | Works with --input_format_csv_unquoted_null_literal_as_null=1 parameter | Works with --input_format_csv_unquoted_null_literal_as_null=1 parameter  |
| ""  | OK  | OK |


### Export form PostgreSQL and import to Clickhouse:

Make sure adding timezone to ```date_format``` and ```datetime_format``` if your timestamp or time columns contain a timezone.

```bash
psql 'postgresql://...' -c "\\copy (SELECT * FROM my_table) to stdout with csv header" | npx @trans/csv-format-converter --config-file my_config.json | clickhouse-client --query="INSERT INTO my_clickhouse_table FORMAT CSVWithNames"
```


```json
{
    "schema":[
        {
            "column_name": "exampleColumn",
            "data_type": "string",
            "nullable": true
        }
    ],
    "input": {
        "separator": ",",
        "header": true,
        "escape": "\\",
        "nulls_encoded_as": "",
        "true_encoded_as": "t",
        "false_encoded_as": "f",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": true
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DD HH:mm:ss"
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "1",
        "false_encoded_as": "0",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.SS"
    }
}
```

### Export form csv and import to Clickhouse:

NOTES:
When importing from csv, user must be aware of data structure, mainly how nulls, Boolean, enclosing and escape are encoded. This is because input values in my-config.json must match those values.

```bash
 cat my_data.csv | npx @trans/csv-format-converter --config-file my_config.json | clickhouse-client --query="INSERT INTO my_clickhouse_table FORMAT CSVWithNames"
```

```json
{
    "schema":[
        {
            "column_name": "exampleColumn",
            "data_type": "string",
            "nullable": false
        }
    ],
    "input": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "t",
        "false_encoded_as": "f",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "1",
        "false_encoded_as": "0",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.SS"
    }
}
```

### Export form MongoDB and import to Clickhouse:

NOTES:
When exporting from MongoDB if user uses a ndjson file and transforms it with json2csv module will throw ParsingException when inserting data with null values in float columns if output "null_encoded_as": "\\N". output "null_encoded_as": "NULL" also will throw ParsingException even with --input_format_csv_unquoted_null_literal_as_null=1 parameter. Is highly recommended to use a different null_encoded_as such as empty string "". This error may occur with large amount of data.

```bash
 cat my_data.ndjson | npx json2csv | npx @trans/csv-format-converter --config-file my_config.json | clickhouse-client --query="INSERT INTO my_clickhouse_table FORMAT CSVWithNames"
```

```json
{
    "schema":[
        {
            "column_name": "exampleColumn",
            "data_type": "string",
            "nullable": false
        }
    ],
    "input": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "t",
        "false_encoded_as": "f",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "1",
        "false_encoded_as": "0",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.ss"
    }
}
```

### CSVFormat examples for import data

##### Clickhouse

```json
{
    "schema":[
        {
            "column_name": "exampleColumn",
            "data_type": "string",
            "nullable": true
        }
    ],
    "input": {
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "1",
        "false_encoded_as": "0",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.ss"
    }
}
```

##### PostgreSQL

```json
{
    "schema":[
        {
            "column_name": "exampleColumn",
            "data_type": "string",
            "nullable": true
        }
    ],
    "input": {
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "t",
        "false_encoded_as": "f",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": true
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DD HH:mm:ss"
    }
}
```

##### MongoDB

NOTES:
Be aware that when importing CSV into MongoDB there is no way to insert null (empty) values. It will try to insert the exact string declared in ```nulls_encoded_as``.

For Import CSV with Specified Field Types: https://docs.mongodb.com/database-tools/mongoimport/#import-csv-with-specified-field-types

```json
{
    "schema":[
        {
            "column_name": "exampleColumn",
            "data_type": "string",
            "nullable": true
        }
    ],
    "input": {
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "",
        "true_encoded_as": "true",
        "false_encoded_as": "false",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DD HH:mm:ss"
    }
}
```

##### Pandas

NOTES:
When importing CSV from Pandas pandas.read_csv() output null_encoded_as can be described as "null", "NULL" or empty string "".
Note that when importing CSV file date and datetime columns can be declared as datetime64[ns] and datetime64[ns, UTC] respectively adding pandas.read_csv(filename, parse_dates=['date', 'datetime']) where 'date' and 'datetime' are column names with date and datetime values.

```json
{
    "schema":[
        {
            "column_name": "exampleColumn",
            "data_type": "string",
            "nullable": true
        }
    ],
    "input": {
    },
    "output": {
        "separator": ",",
        "header": true,
        "escape": "\"",
        "nulls_encoded_as": "null",
        "true_encoded_as": "True",
        "false_encoded_as": "False",
        "encoding": "UTF-8",
        "enclosing": {
            "characters": "\"",
            "strict": false
        },
        "date_format": "YYYY-MM-DD",
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    }
}
```