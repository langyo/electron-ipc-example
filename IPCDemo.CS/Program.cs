using System;
using System.IO;
using System.IO.Pipes;
using System.Security.Principal;
using System.Text;

namespace IPCDemo.CS
{
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
            for (var s = ss.ReadString(); ; s = ss.ReadString())
            {
                Console.Write(s);
                ss.WriteString(s);
            }
            // pipeClient.Close();
        }
    }

    // Defines the data protocol for reading and writing strings on our stream.
    public class StreamString
    {
        private Stream ioStream;
        private UnicodeEncoding streamEncoding;

        public StreamString(Stream ioStream)
        {
            this.ioStream = ioStream;
            streamEncoding = new UnicodeEncoding();
        }

        public string ReadString()
        {
            int len;
            len = ioStream.ReadByte() * 256;
            len += ioStream.ReadByte();
            var inBuffer = new byte[len];
            ioStream.Read(inBuffer, 0, len);

            return streamEncoding.GetString(inBuffer);
        }

        public int WriteString(string outString)
        {
            byte[] outBuffer = streamEncoding.GetBytes(outString);
            int len = outBuffer.Length;
            if (len > ushort.MaxValue)
            {
                len = ushort.MaxValue;
            }
            ioStream.WriteByte((byte)(len / 256));
            ioStream.WriteByte((byte)(len & 255));
            ioStream.Write(outBuffer, 0, len);
            ioStream.Flush();

            return outBuffer.Length + 2;
        }
    }
}