title=Ò»¼üÆô¶¯DataEase 2.10.5

cd /d %~dp0
chcp 65001
set startDir=%cd%
set JAVA_HOME=%startDir%\jdk-21
set PATH=%JAVA_HOME%/bin;%JAVA_HOME%/jdk/bin

chcp 65001
start java -jar -Dfile.encoding=utf-8 CoreApplication.jar

