# CSV format converter

## Description

Converts between different formats in csv files using standard input and standard output.

It makes the CSV formats obtained from different databases and used when importing data to different databases compatible with each other.

For example, with this tool, you will be able to export a CSV file from postgresql and import it to Clickhouse without having to code a specific conversion logic.

### Usage example

CASE 1:

```bash
psql 'postgresql://...' -c "\\copy (SELECT * FROM my_table) to stdout with csv header" | npx @trans/csv-format-converter --config-file my-conf.json | clickhouse-client --query="INSERT INTO my_table FORMAT CSVWithNames"
```


CASE 2:

Given this data.csv:

a,b,c,d,e,f
helloworld,5,1.1,2021-01-27,2012-10-01T09:45:00.000+00:00,

and this config file my-conf.json:

```json
{
    "schema":[
        {
            "column_name": "Column1",
            "data_type": "string",
            "nullable": true
        },
        {
            "column_name": "Column2",
            "data_type": "integer",
            "nullable": true
        },
        {
            "column_name": "Column3",
            "data_type": "float",
            "nullable": true
        },
        {
            "column_name": "Column4",
            "data_type": "date",
            "nullable": true
        },
        {
            "column_name": "Column5",
            "data_type": "datetime",
            "nullable": true
        },
        {
            "column_name": "Column6",
            "data_type": "boolean",
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
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.sssZ"
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
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.sssZ"
    }
}
```

csv-format-converter shuld be called as follows

```bash
cat data.csv | npx @trans/csv-format-converter --config-file my-config.json
```

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
### Config file Json

This Json file is an example of configuraation file with default values. "schema" array must contain a number of objects equivalent to the amount of columns, the type of each column nd if each column is nullable in csv provided.

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
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.sssZ"
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
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.sssZ"
    }
}
```

## Specific Json examples to import to Clickhouse

IMPORTANT WHEN INSERTING TO CLICKHOUSE
null_encoded_as	integer	            float
\N	              OK	             OK
null	          NO	             NO
NULL	          Works with --input_format_csv_unquoted_null_literal_as_null=1 parameter
""	              OK	             OK


# Export form PostgreSQL and import to Clickhouse:

```bash
psql 'postgresql://...' -c "\\copy (SELECT * FROM my_table) to stdout with csv header" | npx @trans/csv-format-converter --config-file my_config.json | clickhouse-client --query="INSERT INTO my_clickhouse_table FORMAT CSVWithNames"
```
When using a ```timestamp without time zone``` column datatype, input CSVFormat is ```json "datetime_format": "YYYY-MM-DD HH:mm:ss"```
When using a ```timestamp with time zone``` column datatype, input CSVFormat is ```json "datetime_format": "YYYY-MM-DD HH:mm:ssZ"```

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
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.ss"
    }
}
```

# Export form csv and import to Clickhouse:

NOTES:
When importing from csv, user must be aware of data structure, mainly how nulls, boolean, enclosing and escape are codified. This is becasuse input values in my-config.json must match those values.

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
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.sssZ"
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


# Export form MongoDB and import to Clickhouse:

NOTES:
When exporting from MongoDB if user uses a ndjson file and transforms it with json2csv module will throw PrsingException when inserting data with null values in float columns if output "null_encoded_as": "\\N". output "null_encoded_as": "NULL" also will throw ParsingException even with --input_format_csv_unquoted_null_literal_as_null=1 parameter. Is highly recommended to use a different null_encoded_as such as empty string "". This error may occur with large amount of data.

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
        "datetime_format": "YYYY-MM-DDTHH:mm:ss.sssZ"
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

## CSVFormat examples for import data

# Clickhouse

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

# PostgreSQL

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


# MongoDB

Be aware that when importing CSV into MongoDB there is no way to insert null (empty) values. It will insert "some" value and that value is what user declares in Jscon config file. 

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
