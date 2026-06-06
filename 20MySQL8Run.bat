@echo off
title MySQL8 Ctrl+C键结束服务
@echo 正在启动MySQL8...
@echo .
@echo ...小提示..................................................................
@echo .                                                                         .
@echo . MySQL8默认参数                                                           .
@echo . 主机名/IP：127.0.0.1                                                    .
@echo . 用户名：root                                                            .
@echo . 密码：123456                                                            .
@echo . 端口：8306                                                              .
@echo .                                                                         .
@echo ...........................................................................
cd /d %~dp0
set startDir=%cd%
cd "%startDir%\mysql-8.0.30\bin"
call startup.bat
