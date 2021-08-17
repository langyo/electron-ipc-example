using System;
using System.IO;
using System.IO.Pipes;
using System.Security.Principal;
using System.Text.Json;

namespace IPCDemo.CS
{
  public class IMsg
  {
    public string caller { get; set; }
    public string callee { get; set; }
    public string[] args { get; set; }
  }

  public class PipeClient
  {
    public static void Main(string[] args)
    {
      // 根据传入的命令行参数，连接到对应的命名管道
      var socketClient =
          new NamedPipeClientStream(".", args[0],
              PipeDirection.InOut, PipeOptions.None,
              TokenImpersonationLevel.Impersonation);
      socketClient.Connect();
      var socketClientStream = new StreamString(socketClient);

      // 创建自己的命名管道，并将命名管道的名称交给对方
      string socketServerAddress = Guid.NewGuid().ToString();
      socketClientStream.Write(new IMsg
      {
        caller = "backend-" + Guid.NewGuid().ToString(),
        callee = "$shakehand",
        args = new string[1] { socketServerAddress }
      });
      for (var s = socketClientStream.Read(); ; s = socketClientStream.Read())
      {
        int num = Convert.ToInt32(s.args[0]);
        num += 1;
        socketClientStream.Write(new IMsg
        {
          caller = s.caller,
          callee = s.callee,
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