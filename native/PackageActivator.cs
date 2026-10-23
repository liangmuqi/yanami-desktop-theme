using System;
using System.IO;
using System.Runtime.InteropServices;
[ComImport,Guid("2E941141-7F97-4756-BA1D-9DECDE894A3D"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface ProbeActivation {
 [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)]string id,[MarshalAs(UnmanagedType.LPWStr)]string args,uint options,out uint pid);
}
[ComImport,Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")] class ProbeManager {}
class PackageActivationProbe {
 [STAThread] static int Main(string[] args) {
  try {var manager=new ProbeManager();try{uint pid;int hr=((ProbeActivation)manager).ActivateApplication(args[0],args[1],0,out pid);File.WriteAllText(args[2],"{\"hresult\":"+hr+",\"processId\":"+pid+"}");return hr<0?1:0;}finally{Marshal.FinalReleaseComObject(manager);}}
  catch(Exception e){File.WriteAllText(args[2]+".error",e.Message);return 2;}
 }
}
