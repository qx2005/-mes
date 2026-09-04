@echo off
title=һ������ ��ҵ������ƽ̨

cd /d %~dp0
set startDir=%cd%
set JAVA_HOME=%startDir%\jdk
set PATH=%JAVA_HOME%/bin;%JAVA_HOME%/jre/bin

rem ����MQTT����
ping 127.0.0.1 -n 11 >nul
@echo ��������MQTT����... 
start %startDir%\01MQTTRun.bat

rem ����ͼƬ��������
ping -n 11 127.0.0.1 >nul
@echo ��������ͼƬ��������...
start  %startDir%\02minIORun.bat

rem ����Redis����
ping 127.0.0.1 -n 11 >nul
@echo ��������Redis����...
start  %startDir%\10RedisRun.bat

rem ����MySQL����
ping -n 11 127.0.0.1 >nul
@echo ��������MySQL����...
start  %startDir%\20MySQLRun.bat

rem ����MySQL8����
ping -n 11 127.0.0.1 >nul
@echo ��������MySQL����...
start  %startDir%\20MySQL8Run.bat

rem ����pgsql����
ping 127.0.0.1 -n 11 >nul
@echo ��������pgsql����...
start  %startDir%\21pgsqlRun.bat

rem ����ƽ̨����
ping -n 11 127.0.0.1 >nul
@echo ��������ƽ̨����...
start java -jar bsq-admin.jar

rem ����IOT����̨
ping 127.0.0.1 -n 11 >nul
@echo ��������IOT����̨����...
set install.data_dir=%startDir%\data
start java -jar thingsboard.jar

rem Start the DataEase production dashboard used by the platform homepage
ping 127.0.0.1 -n 11 >nul
@echo Starting DataEase dashboard service...
set JAVA_HOME=%startDir%\jdk-21
set PATH=%JAVA_HOME%\bin;%JAVA_HOME%\jdk\bin
start "" /D "%startDir%\opt" "%startDir%\jdk-21\bin\java.exe" -Dfile.encoding=utf-8 -jar "%startDir%\CoreApplication.jar"

chcp 65001

rem ����ƽ̨UI
ping 127.0.0.1 -n 11 >nul
@echo ��������ƽ̨UI����...
start  %startDir%\40UIRun.bat

rem Start the isolated Eclipse Theia online IDE (optional; MES remains available if it fails)
@echo Starting embedded Theia IDE on 127.0.0.1:3188...
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%startDir%\tools\start_embedded_theia.ps1"

exit
