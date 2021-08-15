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
    const num = data.slice(2).toString('utf8');
    console.log('即将接收:', data[0] * 256 + data[1], num);
    win?.webContents.send('asynchronous-reply', num);
  });
  let buffer = Buffer.from('114514');
  buffer = Buffer.concat([
    Buffer.from([Math.floor(buffer.byteLength / 256), buffer.byteLength % 256]),
    buffer,
  ]);
  console.log(
    '即将写出:',
    buffer[0] * 256 + buffer[1],
    buffer.slice(2).toString('utf8')
  );
  connection?.write(buffer);
}).listen(join('\\\\?\\pipe', '\\electronIPCDemo'));

import { execFile } from 'child_process';
console.log('尝试启动外部进程...');
let childProcess = execFile(
  join(process.cwd(), '../IPCDemo.CS/bin/Debug/net5.0/IPCDemo.CS.exe'),
  (err) => {
    if (err) {
      console.error(err);
    }
  }
);

app.whenReady().then(() => {
  ipcMain.on('asynchronous-message', (_event, raw) => {
    let buffer = Buffer.from(`${raw}`);
    buffer = Buffer.concat([
      Buffer.from([
        Math.floor(buffer.byteLength / 256),
        buffer.byteLength % 256,
      ]),
      buffer,
    ]);
    console.log(
      '即将写出:',
      buffer[0] * 256 + buffer[1],
      buffer.slice(2).toString('utf8')
    );
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
