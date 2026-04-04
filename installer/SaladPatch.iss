#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif

#define MyAppName "SaladPatch"
#define MyAppPublisher "Angaros"
#define MyAppURL "https://github.com/AngarosGamer/SaladPatch"
#define MyAppExeName "SaladPatchLauncher.exe"

[Setup]
AppId={{BCE73D5D-3D83-421A-8A3A-1A1D8698A7B6}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\SaladPatch
DefaultGroupName=SaladPatch
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=SaladPatch-Setup-v{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".git\*,node_modules\*,dist\*,installer\*,*.log"
Source: "..\installer\bin\SaladPatchLauncher.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\SaladPatch\Launch SaladPatch"; Filename: "{app}\SaladPatchLauncher.exe"; WorkingDir: "{app}"
Name: "{userprograms}\SaladPatch\Open SaladPatch Folder"; Filename: "{app}"
Name: "{userdesktop}\SaladPatch"; Filename: "{app}\SaladPatchLauncher.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\SaladPatchLauncher.exe"; Description: "Launch SaladPatch now"; Flags: postinstall shellexec skipifsilent unchecked
