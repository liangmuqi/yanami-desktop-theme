using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
[ComImport,Guid("2E941141-7F97-4756-BA1D-9DECDE894A3D"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IApplicationActivationManager {
 [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)]string appId,[MarshalAs(UnmanagedType.LPWStr)]string arguments,uint options,out uint processId);
 [PreserveSig] int ActivateForFile([MarshalAs(UnmanagedType.LPWStr)]string appId,IntPtr items,[MarshalAs(UnmanagedType.LPWStr)]string verb,out uint processId);
 [PreserveSig] int ActivateForProtocol([MarshalAs(UnmanagedType.LPWStr)]string appId,IntPtr items,out uint processId);
}
[ComImport,Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")] class ApplicationActivationManager {}
class WindowActivator {
 delegate bool Visitor(IntPtr h,IntPtr data);
 [StructLayout(LayoutKind.Sequential)] struct Rect{public int L,T,R,B;}
 [StructLayout(LayoutKind.Sequential)] struct Point{public int X,Y;}
 [StructLayout(LayoutKind.Sequential)] struct Placement{public int Length,Flags,Show;public Point Min,Max;public Rect Normal;}
 [DllImport("user32.dll")] static extern bool EnumWindows(Visitor callback,IntPtr data);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder name,int size);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] static extern bool GetWindowPlacement(IntPtr h,ref Placement p);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr h,int command);
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [STAThread] static int Main(string[] args){try{
   if(args.Length<2||args.Length>3)return 1;IntPtr found=IntPtr.Zero;long score=0;uint owner=0;var foreground=GetForegroundWindow();
   EnumWindows((h,d)=>{try{var cls=new StringBuilder(128);GetClassName(h,cls,128);if(cls.ToString()!="Chrome_WidgetWin_1")return true;uint pid;GetWindowThreadProcessId(h,out pid);if(args.Length==3&&pid!=UInt32.Parse(args[2]))return true;using(var process=Process.GetProcessById((int)pid)){if(process.SessionId!=Process.GetCurrentProcess().SessionId||!String.Equals(process.MainModule.FileName,args[1],StringComparison.OrdinalIgnoreCase))return true;}Rect r;GetWindowRect(h,out r);if(IsIconic(h)){var placement=new Placement{Length=Marshal.SizeOf(typeof(Placement))};if(GetWindowPlacement(h,ref placement))r=placement.Normal;}long area=(long)(r.R-r.L)*(r.B-r.T);if(r.R-r.L>=400&&r.B-r.T>=300){long rank=area+(IsWindowVisible(h)?100000000:0)+(h==foreground?1000000000:0);if(rank>score){found=h;owner=pid;score=rank;}}}catch{}return true;},IntPtr.Zero);
   if(found!=IntPtr.Zero){ShowWindowAsync(found,IsIconic(found)?9:5);SetForegroundWindow(found);for(int i=0;i<10&&GetForegroundWindow()!=found;i++)Thread.Sleep(30);bool active=GetForegroundWindow()==found;Save("{\"mechanism\":\"async-window-activation\",\"foreground\":"+active.ToString().ToLower()+",\"processId\":"+owner+"}");return active?0:3;}
   object manager=new ApplicationActivationManager();try{uint pid;int result=((IApplicationActivationManager)manager).ActivateApplication(args[0],"",0,out pid);Save("{\"mechanism\":\"windows-app-activation\",\"hresult\":"+result+",\"processId\":"+pid+"}");return result<0?2:0;}finally{Marshal.FinalReleaseComObject(manager);}
 }catch{Save("{\"error\":\"activation-failed\"}");return 1;}}
 static void Save(string value){try{File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"../state/activation-result.json"),value);}catch{}}
}
