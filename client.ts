import { join, isAbsolute, dirname, basename } from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';

let win: BrowserWindow;
app.whenReady().then(() => {
  let count = 0;
  setInterval(() => {
    console.log(
      `${new Date(
        Date.now()
      ).toLocaleTimeString()} 与主进程交换消息的分发速度：${count}`
    );
    count = 0;
  }, 1000);

  ipcMain.on('asynchronous-message', (event, raw) => {
    const { type } = JSON.parse(raw);

    switch (type) {
      case 'ping':
        count += 1;
        event.reply('asynchronous-reply', {
          type: 'pong',
        });
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

  win.loadFile(join(__dirname, './index.html'));
});
