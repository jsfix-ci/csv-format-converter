# CSV format converter

## Description

Converts between different formats in csv files using standard input and standard output.

It makes the CSV formats obtained from different databases and used when importing data to different databases compatible with each other.

For example, with this tool, you will be able to export a CSV file from postgresql and import it to Clickhouse without having to code a specific conversion logic.

### Usage example

```bash
psql 'postgresql://...' -c "\\copy (SELECT * FROM my_table) to stdout with csv header" | npx csv-format-converter --config-file my-conf.json | clickhouse-client --query="INSERT INTO my_table FORMAT CSVWithNames"
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
    [work in progress]
  };
  date_format?: string; // 'YYYY-MM-DD' by default
  datetime_format?: string; // Using toISOString() by default, eg "2020-10-23T08:29:42.695Z"
}
```

[work in progress]
