using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

[ComImport, Guid("2E941141-7F97-4756-BA1D-9DECDE894A3D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IThemeApplicationActivationManager {
    [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string appId, [MarshalAs(UnmanagedType.LPWStr)] string arguments, uint options, out uint processId);
}
[ComImport, Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")] class ThemeApplicationActivationManager {}

// One user action -> one package activation. Never closes, kills, hides or restarts the client.
class ThemeEntry {
    const string Family = "OpenAI.Codex_2p2nqsd0c76g0";
    delegate bool WindowVisitor(IntPtr window, IntPtr data);
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern int GetPackageFamilyName(IntPtr process, ref uint length, StringBuilder name);
    [DllImport("user32.dll")] static extern bool EnumWindows(WindowVisitor visitor, IntPtr data);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window, StringBuilder name, int size);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr window, int command);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);

    static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    static string stateDirectory;
    static bool IsOfficial(uint pid) {
        IntPtr handle = OpenProcess(0x1000, false, pid);
        if (handle == IntPtr.Zero) return false;
        try {
            uint length = 0;
            if (GetPackageFamilyName(handle, ref length, null) != 122) return false;
            var name = new StringBuilder((int)length);
            return GetPackageFamilyName(handle, ref length, name) == 0 && name.ToString() == Family;
        } finally { CloseHandle(handle); }
    }
    static List<uint> Roots() {
        var result = new List<uint>();
        using (var search = new ManagementObjectSearcher("SELECT ProcessId,CommandLine FROM Win32_Process WHERE Name='ChatGPT.exe'"))
        using (var items = search.Get()) foreach (ManagementObject item in items) using (item) {
            string command = item["CommandLine"] as string;
            uint pid = Convert.ToUInt32(item["ProcessId"]);
            if (command != null && !command.Contains("--type=") && IsOfficial(pid)) result.Add(pid);
        }
        return result;
    }
    static IntPtr MainWindow(List<uint> roots) {
        IntPtr found = IntPtr.Zero;
        long best = 0;
        EnumWindows((window, data) => {
            uint pid; GetWindowThreadProcessId(window, out pid);
            if (!roots.Contains(pid)) return true;
            var name = new StringBuilder(128); GetClassName(window, name, name.Capacity);
            if (name.ToString() != "Chrome_WidgetWin_1") return true;
            Rect rect; if (!GetWindowRect(window, out rect)) return true;
            long area = (long)(rect.Right - rect.Left) * (rect.Bottom - rect.Top);
            if (!IsIconic(window) && (rect.Right - rect.Left < 400 || rect.Bottom - rect.Top < 300)) return true;
            long score = area + (IsWindowVisible(window) ? 1000000000L : 0);
            if (score > best) { best = score; found = window; }
            return true;
        }, IntPtr.Zero);
        return found;
    }
    static void Show(IntPtr window) {
        if (IsIconic(window)) ShowWindowAsync(window, 9);
        else if (!IsWindowVisible(window)) ShowWindowAsync(window, 5);
        SetForegroundWindow(window);
    }
    static void EnsureWorker() {
        object serviceObject = null;
        try {
            serviceObject = Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));
            dynamic service = serviceObject;
            service.Connect();
            dynamic task = service.GetFolder("\\").GetTask("YanamiTheme-Recovery");
            if ((int)task.State != 4) task.Run(null);
        } catch { /* The official app still opens if the optional theme worker is unavailable. */ }
        finally { if (serviceObject != null) Marshal.FinalReleaseComObject(serviceObject); }
    }
    static void Save(object value) {
        try { File.WriteAllText(Path.Combine(stateDirectory, "entry-result.json"), Json.Serialize(value)); } catch {}
    }
    [STAThread] static int Main(string[] args) {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        stateDirectory = File.Exists(Path.Combine(baseDirectory, "worker-config.json")) ? baseDirectory : Path.GetFullPath(Path.Combine(baseDirectory, "..", "state"));
        var started = Stopwatch.StartNew();
        try {
            int port = 49339;
            string configPath = Path.Combine(stateDirectory, "worker-config.json");
            if (File.Exists(configPath)) {
                var config = Json.Deserialize<Dictionary<string, object>>(File.ReadAllText(configPath).TrimStart('\uFEFF'));
                port = Convert.ToInt32(config["port"]);
                if (port < 1024 || port > 65535 || (string)config["appId"] != Family + "!App") throw new Exception("Unexpected application identity or port.");
            }
            List<uint> roots = Roots();
            if (args.Length == 1 && args[0] == "--check") {
                File.WriteAllText(Path.Combine(stateDirectory, "entry-check.json"), Json.Serialize(new { roots = roots, windowFound = MainWindow(roots) != IntPtr.Zero, noClientMutation = true }));
                return 0;
            }
            EnsureWorker();
            using (var mutex = new Mutex(false, "Local\\YanamiTheme.SingleLaunch." + System.Security.Principal.WindowsIdentity.GetCurrent().User.Value)) {
                bool owns;
                try { owns = mutex.WaitOne(0); } catch (AbandonedMutexException) { owns = true; }
                if (!owns) return 0;
                try {
                    roots = Roots();
                    IntPtr window = MainWindow(roots);
                    if (window != IntPtr.Zero) {
                        Show(window);
                        Save(new { at = DateTime.UtcNow.ToString("o"), mode = "existing-window", roots = roots, activationCount = 0, clientRestarts = 0, elapsedMs = started.ElapsedMilliseconds });
                        return 0;
                    }
                    bool cold = roots.Count == 0;
                    string arguments = cold ? "--remote-debugging-address=127.0.0.1 --remote-debugging-port=" + port : "";
                    object manager = new ThemeApplicationActivationManager();
                    uint activated;
                    try {
                        int hr = ((IThemeApplicationActivationManager)manager).ActivateApplication(Family + "!App", arguments, 0, out activated);
                        if (hr < 0) Marshal.ThrowExceptionForHR(hr);
                    } finally { Marshal.FinalReleaseComObject(manager); }
                    Save(new { at = DateTime.UtcNow.ToString("o"), mode = cold ? "cold-single-activation" : "existing-background-activation", activatedPid = activated, activationCount = 1, clientRestarts = 0, windowFound = false });
                    // Allow normal startup to create its window; no opacity or focus gate.
                    for (int i = 0; i < 40; i++) {
                        Thread.Sleep(250);
                        roots = Roots(); window = MainWindow(roots);
                        // Let the native application reveal its ready window. Showing a
                        // hidden startup HWND here can produce another flash.
                        if (window == IntPtr.Zero || !IsWindowVisible(window)) continue;
                        Save(new { at = DateTime.UtcNow.ToString("o"), mode = cold ? "cold-single-activation" : "existing-background-activation", roots = roots, activationCount = 1, clientRestarts = 0, windowFound = true, elapsedMs = started.ElapsedMilliseconds });
                        return 0;
                    }
                    Save(new { at = DateTime.UtcNow.ToString("o"), mode = "window-not-yet-observed", activationCount = 1, clientRestarts = 0, elapsedMs = started.ElapsedMilliseconds });
                    return 2;
                } finally { mutex.ReleaseMutex(); }
            }
        } catch (Exception error) {
            Save(new { at = DateTime.UtcNow.ToString("o"), error = error.Message, clientRestarts = 0 });
            return 1;
        }
    }
}
