using System;
using System.Collections.Generic;
using System.Management;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
class ConnectionInfo {
 delegate bool Visitor(IntPtr window,IntPtr data);
 [StructLayout(LayoutKind.Sequential)] struct Rect {public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")] static extern bool EnumWindows(Visitor callback,IntPtr data);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window,StringBuilder name,int length);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window,out Rect rect);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("iphlpapi.dll",SetLastError=true)] static extern uint GetExtendedTcpTable(IntPtr table,ref int size,bool order,int family,int tableClass,uint reserved);
 [StructLayout(LayoutKind.Sequential)] struct Row {public uint State,LocalAddress,LocalPort,RemoteAddress,RemotePort,Pid;}
 static string Json(string s){return "\""+s.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\r","\\r").Replace("\n","\\n")+"\"";}
 static int Main(string[] args){try{
  if(args.Length!=2)return 1;int port=Int32.Parse(args[1]);if(port<1024||port>65535)return 1;
  var roots=new List<string>();var listeners=new List<string>();var windows=new List<string>();var rootPids=new HashSet<uint>();
  using(var search=new ManagementObjectSearcher("SELECT ProcessId,ExecutablePath,CreationDate,CommandLine FROM Win32_Process WHERE Name='ChatGPT.exe'"))using(var items=search.Get())foreach(ManagementObject item in items){using(item){
   string exe=item["ExecutablePath"] as string,cmd=item["CommandLine"] as string;
   if(!String.Equals(exe,args[0],StringComparison.OrdinalIgnoreCase)||cmd==null||cmd.Contains("--type="))continue;
   string created=ManagementDateTimeConverter.ToDateTime((string)item["CreationDate"]).ToUniversalTime().ToString("o");
   bool debug=Regex.IsMatch(cmd,@"--remote-debugging-port="+port+@"(?:\s|$)");
   rootPids.Add(Convert.ToUInt32(item["ProcessId"]));
   roots.Add("{\"pid\":"+item["ProcessId"]+",\"created\":"+Json(created)+",\"debug\":"+debug.ToString().ToLowerInvariant()+",\"custom\":"+cmd.Contains("--user-data-dir").ToString().ToLowerInvariant()+"}");
  }}
  int size=0;GetExtendedTcpTable(IntPtr.Zero,ref size,false,2,3,0);IntPtr table=Marshal.AllocHGlobal(size);
  try{uint result=GetExtendedTcpTable(table,ref size,false,2,3,0);if(result!=0)throw new Exception("TCP inspection failed.");int count=Marshal.ReadInt32(table),step=Marshal.SizeOf(typeof(Row));for(int i=0;i<count;i++){
   var row=(Row)Marshal.PtrToStructure(IntPtr.Add(table,4+i*step),typeof(Row));int localPort=(int)(((row.LocalPort&255)<<8)|((row.LocalPort>>8)&255));if(localPort!=port)continue;
   listeners.Add("{\"pid\":"+row.Pid+",\"address\":"+Json(new IPAddress(row.LocalAddress).ToString())+"}");
  }}finally{Marshal.FreeHGlobal(table);}
  EnumWindows((window,data)=>{uint pid;GetWindowThreadProcessId(window,out pid);if(!rootPids.Contains(pid))return true;var name=new StringBuilder(128);GetClassName(window,name,128);if(name.ToString()!="Chrome_WidgetWin_1")return true;Rect rect;GetWindowRect(window,out rect);bool iconic=IsIconic(window);if(!iconic&&(rect.Right-rect.Left<400||rect.Bottom-rect.Top<300))return true;windows.Add("{\"pid\":"+pid+",\"visible\":"+IsWindowVisible(window).ToString().ToLowerInvariant()+",\"minimized\":"+iconic.ToString().ToLowerInvariant()+",\"foreground\":"+(GetForegroundWindow()==window).ToString().ToLowerInvariant()+"}");return true;},IntPtr.Zero);
  Console.OutputEncoding=new UTF8Encoding(false);Console.Write("{\"roots\":["+String.Join(",",roots)+"],\"listeners\":["+String.Join(",",listeners)+"],\"windows\":["+String.Join(",",windows)+"]}");return 0;
 }catch(Exception e){Console.Error.WriteLine(e.Message);return 2;}}
}
