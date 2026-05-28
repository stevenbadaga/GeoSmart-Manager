@echo off
setlocal

pushd "%~dp0" >nul
set "MAVEN_PROJECTBASEDIR=%CD%"

if defined JAVA_HOME (
    set "JAVA_HOME_CLEAN=%JAVA_HOME:"=%"
    if defined JAVA_HOME_CLEAN (
        set "JAVA_EXE=%JAVA_HOME_CLEAN%\bin\java.exe"
        if exist "%JAVA_EXE%" goto javaFound
        echo Warning: ignoring invalid JAVA_HOME "%JAVA_HOME%". >&2
    )
)

set "JAVA_EXE="
for /f "usebackq delims=" %%i in (`where java 2^>nul`) do if not defined JAVA_EXE set "JAVA_EXE=%%i"
if not defined JAVA_EXE (
    echo Error: Java was not found. Set JAVA_HOME or add java.exe to PATH. >&2
    popd >nul
    exit /b 1
)

:javaFound

"%JAVA_EXE%" ^
  %MAVEN_OPTS% ^
  %MAVEN_DEBUG_OPTS% ^
  -classpath "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar" ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  org.apache.maven.wrapper.MavenWrapperMain %*

set "EXIT_CODE=%ERRORLEVEL%"
popd >nul
exit /b %EXIT_CODE%
