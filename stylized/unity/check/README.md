# Checking the Unity scripts without Unity

- `python3 cscheck.py ../FeatherField/Scripts/*.cs ../FeatherField/Editor/*.cs`: a syntax check with tree-sitter.
- `dotnet build -nologo -v q`: compiles the runtime scripts against `Stubs.cs`, which stands in for the parts of Unity's API they use (with Unity's real signatures). Add `-p:DefineConstants=OLD_INPUT` to check the old input system's branch too.
  - The .NET 8 SDK comes from Ubuntu's packages: `apt-get update && apt-get install -y dotnet-sdk-8.0`. NuGet is blocked, so `nuget.config` clears the package sources and the build runs offline.
  - When a script uses a Unity member that isn't stubbed yet, add it to `Stubs.cs` with Unity's exact signature.
- The editor scripts (FarmSetup, the updater) aren't compiled: they're reviewed by hand.
