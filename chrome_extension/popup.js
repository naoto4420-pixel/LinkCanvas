// インポートファイル
import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('connection-status');
  const saveBtn = document.getElementById('save-btn');
  const openOptionsBtn = document.getElementById('open-options');

  // 保存データ取得
  const settings = await chrome.storage.sync.get(['mode', 'scrWidth', 'scrHeight']);

  // 保存されているモードを読み込んでラジオボタンに反映
  if (settings.mode) {
    const radio = document.querySelector(`input[name="mode"][value="${settings.mode}"]`);
    if (radio) radio.checked = true;
  }

  // ラジオボタン変更時にモードを保存
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      chrome.storage.sync.set({ mode: e.target.value });
    });
  });

  // 固定スクリーンショットの幅高さを反映
  const scrWidthInput = document.querySelector(`input[name="scr-width"]`);
  const scrHeightInput = document.querySelector(`input[name="scr-height"]`);
  if (settings.scrWidth) scrWidthInput.value = settings.scrWidth;
  if (settings.scrHeight) scrHeightInput.value = settings.scrHeight;

  // バリデーション＆保存関数
  const setupInputValidation = (inputElement, storageKey) => {
    inputElement.addEventListener('change', (e) => {
      // 入力値を数値化
      let val = Number(e.target.value);
      
      // HTMLに設定されているmax/min属性を取得して数値化
      const maxVal = Number(inputElement.max);
      const minVal = Number(inputElement.min);

      // バリデーションチェック
      if (val > maxVal) {
        // 最大値を超えていたら、最大値に強制修正する（またはエラーを表示する）
        val = maxVal;
        inputElement.value = maxVal; // 画面上の表示も戻す
        
        // エラーメッセージを出す
        statusDiv.textContent = `注意: 最大値は ${maxVal} です`;
        statusDiv.style.color = 'orange';
      } else if (val < minVal) {
        // 最小値未満なら最小値にする
        val = minVal;
        inputElement.value = minVal;

        // エラーメッセージを出す
        statusDiv.textContent = `注意: 最小値は ${minVal} です`;
        statusDiv.style.color = 'orange';
      } else {
        // 正常な場合、メッセージをクリア
        statusDiv.textContent = '';
      }

      // 4. 修正後の値を保存
      chrome.storage.sync.set({ [storageKey]: val });
    });
  };

  // 固定スクリーンショットの幅高さ変更時に値を保存
  setupInputValidation(scrWidthInput, 'scrWidth');
  setupInputValidation(scrHeightInput, 'scrHeight');

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
      const response = await fetch(`${API_BASE_URL}/api/v1/links`, {
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
      case 'range':
        // contents.js用にメッセージを送る
        chrome.tabs.sendMessage(tab.id, {
          action: "start_selection"
        });

        // 通知で誘導
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'LinkCanvas',
          message: '画面をドラッグして、サムネイルにする範囲を選択してください。'
        });

        // 選択の邪魔にならないようポップアップを閉じる
        window.close();

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
              // 固定切り抜き: crop情報を設定
              const width = settings.scrWidth || 1280;
              const height = settings.scrHeight || 720;
              const crop = { x: 0, y: 0, width: width, height: height };
              
              sendToApi({ url: tab.url, title: tab.title, screenshot: croppedDataUrl, crop: crop});
              
              break;
          }
        });
        break;
      default:
        console.warn("未定義のモード:", mode);
        statusDiv.textContent = 'エラー: 不明なモードです';
        break;
    }
  });
});
