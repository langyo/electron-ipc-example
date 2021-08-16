let win: BrowserWindow;

import { join } from 'path';
import { Buffer } from 'buffer';
import { app, BrowserWindow, ipcMain } from 'electron';
import { createServer, Socket } from 'net';

interface IMsg {
  caller: number;
  callee: string;
  args: string[];
}

function encodeBuffer(obj: IMsg): Buffer {
  let buffer = Buffer.from(JSON.stringify(obj));
  return Buffer.concat([
    Buffer.from([Math.floor(buffer.byteLength / 256), buffer.byteLength % 256]),
    buffer,
  ]);
}

function decodeBuffer(buffer: Buffer): IMsg {
  let length = buffer[0] * 256 + buffer[1];
  if (buffer.length !== length + 2) {
    throw Error(`无法分析的消息长度，预计长度 ${length + 2}，实际长度 ${buffer.length}`);
  }
  return JSON.parse(buffer.slice(2).toString('utf8'));
}

let connection: Socket;
let outsideIpcServer = createServer((connect) => {
  console.log('已检测到连接');
  connection = connect;
  connect.on('error', (err) => {
    console.log(`对外 IPC 通道发生错误: ${err}`);
    connect.end();
  });
  connect.on('close', () => {
    console.log('对外 IPC 通道已关闭');
  });
  connect.on('data', (data: Buffer) => {
    const { caller, callee, args: [numStr] } = decodeBuffer(data);
    console.log('入口:', caller, callee, numStr);
    win?.webContents.send('asynchronous-reply', numStr);
  });
  const time = Date.now();
  console.log('出口:', time, 'test', '0');
  connection?.write(
    encodeBuffer({ caller: time, callee: 'test', args: ['0'] })
  );
}).listen(join('\\\\?\\pipe', '\\electronIPCDemo'));

import { exec } from 'child_process';
console.log('尝试启动外部进程...');
let childProcess = exec(
  `${join(process.cwd(), '../IPCDemo.CS/bin/Debug/net5.0/IPCDemo.CS.exe')} fuck you`,
  (err) => {
    if (err) {
      console.error(err);
    }
  }
);

app.whenReady().then(() => {
  ipcMain.on('asynchronous-message', (_event, raw) => {
    const time = Date.now();
    console.log('出口:', time, 'test', raw);
    connection?.write(
      encodeBuffer({ caller: time, callee: 'test', args: [`${raw}`] })
    );
  });

  win = new BrowserWindow({
    width: 400,
    height: 300,
    backgroundColor: '#22272e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(join(process.cwd(), './index.html'));
  win.on('close', () => {
    outsideIpcServer.close(() => {
      childProcess.kill();
      process.exit(0);
    });
  });
});
