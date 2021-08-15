let win: BrowserWindow;

import { join } from 'path';
import { Buffer } from 'buffer';
import { app, BrowserWindow, ipcMain } from 'electron';
import { createServer, Socket } from 'net';

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
    console.log(data.slice(2).toString('utf8'));
    win?.webContents.send(
      'asynchronous-reply',
      'ping'
    );
  });
  let buffer = Buffer.from('ping');
  let length = buffer.byteLength;
  buffer = Buffer.concat([Buffer.from([Math.ceil(length / 256), length % 256]), buffer]);
  connection?.write(buffer);
}).listen(join('\\\\?\\pipe', '\\electronIPCDemo'));

import { execFile } from 'child_process';
console.log('尝试启动外部进程...');
let childProcess = execFile(join(process.cwd(), '../IPCDemo.CS/bin/Debug/net5.0/IPCDemo.CS.exe'), err => {
  if (err) {
    console.error(err);
  }
});

app.whenReady().then(() => {
  ipcMain.on('asynchronous-message', (_event, _raw) => {
    let buffer = Buffer.from('ping');
    let length = buffer.byteLength;
    buffer = Buffer.concat([Buffer.from([Math.ceil(length / 256), length % 256]), buffer]);
    connection?.write(buffer);
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
