document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('connection-status');
  const saveOgpBtn = document.getElementById('save-ogp');
  const saveScreenshotBtn = document.getElementById('save-screenshot'); // ボタン取得
  const openOptionsBtn = document.getElementById('open-options');

  // 共通の送信処理関数
  const sendToApi = async (data) => {
    // 1. トークンの取得
    const result = await chrome.storage.sync.get(['apiToken']);
    const token = result.apiToken;

    if (!token) {
      statusDiv.textContent = 'エラー: 設定画面でトークンを入力してください';
      statusDiv.style.color = 'red';
      return;
    }

    statusDiv.textContent = '送信中...';
    statusDiv.style.color = 'blue';

    try {
      const response = await fetch('http://localhost:3000/api/v1/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_token: token,
          ...data // URL, title, screenshot などを展開して結合
        }),
      });

      if (response.ok) {
        statusDiv.textContent = '保存成功！';
        statusDiv.style.color = 'green';
      } else {
        const errorData = await response.json();
        // 配列でエラーが返ってくる場合と単一の場合に対応
        const errorMsg = Array.isArray(errorData.error) ? errorData.error.join(', ') : errorData.error;
        statusDiv.textContent = `失敗: ${errorMsg || response.statusText}`;
        statusDiv.style.color = 'red';
      }
    } catch (error) {
      statusDiv.textContent = '通信エラー: サーバーが起動していますか？';
      statusDiv.style.color = 'red';
      console.error(error);
    }
  };

  // 設定画面を開くボタン
  openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  // ▼ [OGPモード] 保存ボタン
  saveOgpBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    // URLとタイトルだけ送る（スクショなし）
    sendToApi({
      url: tab.url,
      title: tab.title
    });
  });

  // ▼ [スクショモード] 保存ボタン（新規追加）
  saveScreenshotBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    statusDiv.textContent = '撮影中...';
    
    // 現在のタブを見えている範囲で撮影 (PNG形式のBase64文字列が返る)
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = '撮影失敗: ' + chrome.runtime.lastError.message;
        return;
      }

      // 撮影データを含めて送信
      sendToApi({
        url: tab.url,
        title: tab.title,
        screenshot: dataUrl // これがAPIの params[:screenshot] に入る
      });
    });
  });
});