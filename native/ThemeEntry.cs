using System;
using System.IO;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Runtime.InteropServices;
class ThemeEntry {
 [DllImport("user32.dll")] static extern bool AllowSetForegroundWindow(uint pid);
 static string StatePath(){string p=AppDomain.CurrentDomain.BaseDirectory;return File.Exists(Path.Combine(p,"worker-config.json"))?p:Path.GetFullPath(Path.Combine(p,"..","state"));}
 [STAThread] static int Main(string[] args){
  try {
   string root=StatePath();
   if(args.Length==1&&args[0]=="--check-port"){var c=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(root,"worker-config.json")).TrimStart('\uFEFF'));return Convert.ToInt32(c["port"]);}
   AllowSetForegroundWindow(0xffffffff);
   string id=Guid.NewGuid().ToString("N"),temp=Path.Combine(root,"launch-"+id+".tmp");
   File.WriteAllText(temp,new JavaScriptSerializer().Serialize(new {id=id,at=DateTime.UtcNow.ToString("o")}));
   string request=Path.Combine(root,"launch-request.json");
   if(File.Exists(request)) File.Replace(temp,request,null); else File.Move(temp,request);
   return 0;
  } catch{return 1;}
 }
}
