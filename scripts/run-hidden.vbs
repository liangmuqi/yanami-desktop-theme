Option Explicit
Dim shell, nodePath, scriptPath, result
Set shell = CreateObject("WScript.Shell")
nodePath = WScript.Arguments(0)
scriptPath = WScript.Arguments(1)
result = shell.Run(Chr(34) & nodePath & Chr(34) & " " & Chr(34) & scriptPath & Chr(34), 0, True)
WScript.Quit result
