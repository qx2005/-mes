@echo off
title=一键启动 工业互联网平台

cd /d %~dp0
set startDir=%cd%
set JAVA_HOME=%startDir%\jdk
set PATH=%JAVA_HOME%/bin;%JAVA_HOME%/jre/bin

rem 启动MQTT服务
ping 127.0.0.1 -n 11 >nul
@echo 正在启动MQTT服务... 
start %startDir%\01MQTTRun.bat

rem 启动图片附件服务
ping -n 11 127.0.0.1 >nul
@echo 正在启动图片附件服务...
start  %startDir%\02minIORun.bat

rem 启动Redis服务
ping 127.0.0.1 -n 11 >nul
@echo 正在启动Redis服务...
start  %startDir%\10RedisRun.bat

rem 启动MySQL服务
ping -n 11 127.0.0.1 >nul
@echo 正在启动MySQL服务...
start  %startDir%\20MySQLRun.bat

rem 启动MySQL8服务
ping -n 11 127.0.0.1 >nul
@echo 正在启动MySQL服务...
start  %startDir%\20MySQL8Run.bat

rem 启动pgsql服务
ping 127.0.0.1 -n 11 >nul
@echo 正在启动pgsql服务...
start  %startDir%\21pgsqlRun.bat

rem 启动平台服务
ping -n 11 127.0.0.1 >nul
@echo 正在启动平台服务...
start java -jar bsq-admin.jar

rem 启动IOT控制台
ping 127.0.0.1 -n 11 >nul
@echo 正在启动IOT控制台服务...
set install.data_dir=%startDir%\data
start java -jar thingsboard.jar

chcp 65001

rem 启动平台UI
ping 127.0.0.1 -n 11 >nul
@echo 正在启动平台UI服务...
start  %startDir%\40UIRun.bat

exit