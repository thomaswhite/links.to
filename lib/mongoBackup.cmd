@echo on
setlocal
set _zipfile_HR=%time:~0,2%
set _zipfile_HR=%_zipfile_HR: =0%

set _zipfile=c:\data\backup\%1-mongodb.%date:~-4,4%%date:~4,2%%date:~-7,2%T%_zipfile_HR%%time:~3,2%%time:~6,2%.7z

rd .\temp /s /q

c:\data\mongodb\bin\mongo.exe admin c:\data\mongodb\lock-server.js
xcopy c:\data\mongodb\master\data\%1\*.* .\temp /q /s /y /i 
c:\_data\mongodb\bin\mongo.exe admin c:\data\mongodb\unlock-server.js

del c:\data\backup\%1-mongodb.7z
"\Program Files\7-Zip\7z.exe" a -r %_zipfile% .\temp

rem copy %_zipfile% C:\_dropbox\Dropbox\powers\kenegozi\data-backup

endlocal

rd .\temp /s /q
