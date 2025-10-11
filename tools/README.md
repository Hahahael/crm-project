Run MSSQL interactive runner

This folder contains a small interactive script you can use during development to run ad-hoc MSSQL queries against the project's configured database.

File: tools/run-mssql.js

Usage:

# from the project root
node tools/run-mssql.js

Type SQL statements and terminate with a semicolon (;) to execute them. Multi-line statements are supported. Type `.exit` to quit.

Configuration:
You may override connection details using environment variables:

MSSQL_USER, MSSQL_PASSWORD, MSSQL_SERVER, MSSQL_DATABASE

Example:

MSSQL_USER=CRMUser MSSQL_PASSWORD=secret MSSQL_SERVER=127.0.0.1 MSSQL_DATABASE=testdb node tools/run-mssql.js

Security:
This tool is for development use only. Avoid running it against production databases unless you understand the risks.