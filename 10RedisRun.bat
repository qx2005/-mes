@echo off
title Redis Ctrl+C键结束服务
@echo 正在启动Redis...
@echo .
@echo ...小提示..................................................................
@echo .                                                                         .
@echo . Redis默认参数                                                           .
@echo . 主机名/IP：127.0.0.1                                                    .
@echo . 用户名：                                                            .
@echo . 密码：                                                               .
@echo . 端口：6379                                                            .
@echo .                                                                         .
@echo ...........................................................................
cd /d %~dp0
set startDir=%cd%
cd "%startDir%\Redis"
call redis-server.exe redis.windows.conf
