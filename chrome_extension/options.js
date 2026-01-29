// 設定を保存する
const saveOptions = () => {
  const token = document.getElementById('api-token').value;
  // チェックボックスの状態を取得
  const autoSave = document.getElementById('auto-save').checked;

  // apiToken と autoSave をまとめて保存
  chrome.storage.sync.set({ apiToken: token, autoSave: autoSave }, () => {
    const status = document.getElementById('status');
    status.textContent = '保存しました！';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
};

// 設定を読み込んで表示する
const restoreOptions = () => {
  // デフォルト値: tokenは空、autoSaveは false (オフ)
  chrome.storage.sync.get({ apiToken: '', autoSave: false }, (items) => {
    document.getElementById('api-token').value = items.apiToken;
    // チェックボックスの状態を反映
    document.getElementById('auto-save').checked = items.autoSave;
  });
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);