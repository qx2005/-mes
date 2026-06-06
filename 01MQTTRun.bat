@echo off
title=Ò»¼üÆô¶¯ ActiveMQ

cd /d %~dp0
set startDir=%cd%
set JAVA_HOME=%startDir%\jdk
set PATH=%JAVA_HOME%\bin;%JAVA_HOME%\jre\bin

start %startDir%\activemq\bin\win64\activemq.bat

exit