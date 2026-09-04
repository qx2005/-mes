title=һ������BSQ-MES

cd /d %~dp0
set startDir=%cd%
set JAVA_HOME=%startDir%\jdk
set PATH=%JAVA_HOME%/bin;%JAVA_HOME%/jdk/bin

start java -jar bsq-admin.jar

