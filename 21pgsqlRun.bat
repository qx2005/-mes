title=Æô¶¯pgsqlÊý¾Ý¿â

echo I am ready to set environment variables...

set PGHOME=%cd%\pgsql
set PATH=%PGHOME%\bin;%path%
set PGHOST=localhost
set PGLIB=%PGHOME%\lib
set PGDATA=%PGHOME%\data

echo I am ready to start pg_ctl...

pg_ctl start
