title=Ò»¼üÆô¶¯ThingsBoard

cd /d %~dp0
set startDir=%cd%
set JAVA_HOME=%startDir%\jdk
set PATH=%JAVA_HOME%/bin;%JAVA_HOME%/jre/bin

set install.data_dir=%startDir%\data
start java -jar thingsboard.jar

