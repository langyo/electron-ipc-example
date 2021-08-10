function log(...args) {
  console.log(`[主进程] ${new Date(Date.now()).toLocaleTimeString()}`, ...args);
}

let win: BrowserWindow;
let count = 0;
setInterval(() => {
  log('分发速度：', count);
  count = 0;
}, 1000);

import { join } from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { createServer, Socket } from 'net';

let connection: Socket;
let outsideIpcServer = createServer((connect) => {
  connection = connect;
  connect.setEncoding('utf8');
  connect.on('error', (err) => {
    log('对外 IPC 通道发生错误：', err);
    connect.end();
  });
  connect.on('close', () => {
    log('对外 IPC 通道已关闭');
  });
  connect.on('data', (data: string) => {
    const { type } = JSON.parse(data);
    switch (type) {
      case 'pong':
        count += 1;
        win.webContents.send(
          'asynchronous-reply',
          JSON.stringify({ type: 'pong' })
        );
        break;
    }
  });
}).listen(join('\\\\?\\pipe', '\\electronIPCDemo'));
outsideIpcServer.on('error', (err) => {
  log('对外 IPC 通道发生错误：', err);
});

import { spawn } from 'child_process';
let childProcess = spawn('node', [join(__dirname, './server.js')], {
  stdio: 'inherit',
  detached: true,
  shell: true,
});

process.on('exit', () => {
  childProcess.kill();
});

app.whenReady().then(() => {
  ipcMain.on('asynchronous-message', (_event, raw) => {
    const { type } = JSON.parse(raw);

    switch (type) {
      case 'ping':
        connection.write(JSON.stringify({ type: 'ping' }));
        break;
    }
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
  win.on('closed', () => {
    childProcess.kill();
  });
});
