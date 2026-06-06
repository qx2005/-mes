title=Æô¶¯ minIO

cd /d %~dp0
set startDir=%cd%
cd "%startDir%\minio"

minio.exe server "%startDir%\minio"