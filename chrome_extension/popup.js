document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('connection-status');
  const saveBtn = document.getElementById('save-btn');
  const openOptionsBtn = document.getElementById('open-options');

  // 保存されているモードを読み込んでラジオボタンに反映
  const stored = await chrome.storage.sync.get(['mode']);
  if (stored.mode) {
    const radio = document.querySelector(`input[name="mode"][value="${stored.mode}"]`);
    if (radio) radio.checked = true;
  }

  // ラジオボタン変更時にモードを保存
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      chrome.storage.sync.set({ mode: e.target.value });
    });
  });

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

  // 保存ボタン
  saveBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    // 選択モード取得
    const selectedMode = document.querySelector('input[name="mode"]:checked');
    const mode = selectedMode.value;

    // 選択された方法で画像取得
    switch (mode) {
      case 'ogp':
        // OGPモード: URLとタイトルだけ送信
        sendToApi({ url: tab.url, title: tab.title });
        
        break;
      case 'viewport':
      case 'fixed':
        // スクショ撮影が必要なモード
        statusDiv.textContent = '撮影中...';
        
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
          // エラーチェック
          if (chrome.runtime.lastError) {
            console.error("撮影エラー:", chrome.runtime.lastError.message);
            statusDiv.textContent = '撮影失敗: ' + chrome.runtime.lastError.message;
            return;
          }

          if (!dataUrl) {
            statusDiv.textContent = '撮影失敗: データが空です';
            return;
          }
          
          switch (mode) {
            case 'viewport':
              // ビューポート: そのまま送信
              sendToApi({ url: tab.url, title: tab.title, screenshot: dataUrl });
              
              break;
            case 'fixed':
              // 固定切り抜き: Canvasを使って加工
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const width = 1280;
                const height = 720;
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height, 0, 0, width, height);
                
                const croppedDataUrl = canvas.toDataURL('image/png');
                sendToApi({ url: tab.url, title: tab.title, screenshot: croppedDataUrl });
              };
              // 画像読み込みエラーハンドリング
              img.onerror = (e) => {
                 console.error("画像処理エラー", e);
                 statusDiv.textContent = '画像処理に失敗しました';
              };
              img.src = dataUrl;
              
              break;
          }
        });
        break;
      default:
        console.warn("未定義のモード:", mode);
        statusDiv.textContent = 'エラー: 不明なモードです';
        break;
    }

    // 範囲選択の場合はメッセージを送信
    if (mode === 'range') {
      // 現在のアクティブなタブを特定
      const [rangeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (rangeTab && rangeTab.url === bookmark.url) {
        // contents.js用にメッセージを送る
        chrome.tabs.sendMessage(rangeTab.id, {
          action: "start_selection"
        });
      }
    }

  });
});