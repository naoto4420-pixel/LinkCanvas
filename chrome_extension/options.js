// 設定を保存する
const saveOptions = () => {
  const token = document.getElementById('api-token').value;
  // チェックボックスの状態を取得
  const autoSave = document.getElementById('auto-save').checked;
  const autoDelete = document.getElementById('auto-delete').checked;

  // apiToken、autoSave、autoDelete をまとめて保存
  chrome.storage.sync.set({ apiToken: token, autoSave: autoSave, autoDelete: autoDelete}, () => {
    const status = document.getElementById('status');
    status.textContent = '保存しました！';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
};

// 設定を読み込んで表示する
const restoreOptions = () => {
  // デフォルト値: tokenは空、autoSave/autoDeleteは false (オフ)
  chrome.storage.sync.get({apiToken: '', autoSave: false, autoDelete: false}, (items) => {
    document.getElementById('api-token').value = items.apiToken;
    // チェックボックスの状態を反映
    document.getElementById('auto-save').checked = items.autoSave;
    document.getElementById('auto-delete').checked = items.autoDelete;
  });
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);