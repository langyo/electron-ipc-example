﻿using System;
using System.IO;
using System.IO.Pipes;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace IPCDemo.CS
{
  public class IMsg
  {
    public Int64 caller { get; set; }
    public string callee { get; set; }
    public string[] args { get; set; }
  }

  public class PipeClient
  {
    public static void Main(string[] args)
    {
      var pipeClient =
          new NamedPipeClientStream(".", "electronIPCDemo",
              PipeDirection.InOut, PipeOptions.None,
              TokenImpersonationLevel.Impersonation);

      Console.WriteLine("正在连接到渲染进程...\n");
      pipeClient.Connect();

      var ss = new StreamString(pipeClient);
      for (var s = ss.Read(); ; s = ss.Read())
      {
        int num = Convert.ToInt32(s.args[0]);
        num += 1;
        ss.Write(new IMsg
        {
          caller = s.caller,
          callee = args[1],
          args = new string[1] { Convert.ToString(num) }
        });
      }
      // pipeClient.Close();
    }
  }

  // Defines the data protocol for reading and writing strings on our stream.
  public class StreamString
  {
    private Stream ioStream;

    public StreamString(Stream ioStream)
    {
      this.ioStream = ioStream;
    }

    public IMsg Read()
    {
      int len = ioStream.ReadByte() * 256 + ioStream.ReadByte();
      var inBuffer = new byte[len];
      ioStream.Read(inBuffer, 0, len);

      return JsonSerializer.Deserialize<IMsg>(inBuffer);
    }

    public int Write(IMsg msg)
    {
      byte[] outBuffer = JsonSerializer.SerializeToUtf8Bytes(msg);
      int len = outBuffer.Length;
      ioStream.WriteByte((byte)(len / 256));
      ioStream.WriteByte((byte)(len % 256));
      ioStream.Write(outBuffer, 0, len);
      ioStream.Flush();

      return outBuffer.Length + 2;
    }
  }
}