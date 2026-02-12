// 拡張機能インストール時
chrome.runtime.onInstalled.addListener(() => {
  console.log("LinkCanvas Extension installed.");
});

// 1. ブックマーク作成イベントを監視
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (!bookmark.url) return;

  // 保存データ取得
  const settings = await chrome.storage.sync.get(['apiToken', 'autoSave', 'mode']);

  // 設定チェック
  if (!settings.apiToken) {
    console.warn("APIトークン未設定");
    return;
  }
  if (!settings.autoSave) {
    console.log("自動保存OFF");
    return;
  }

  // ▼ 分岐処理 (switch文に変更)
  switch (settings.mode) {
    case 'range':
      // 【範囲選択モード】の場合
      console.log("範囲選択モード起動...");

      // 現在のアクティブなタブを特定
      const [rangeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      // ブックマークボタンからブックマークした時のみ範囲選択を行う
      // ※範囲選択モード時にブックマークマネージャーなどから手入力した場合はOGPで保存
      if (rangeTab && rangeTab.url === bookmark.url) {
        // contents.js用にメッセージを送る
        chrome.tabs.sendMessage(rangeTab.id, {
          action: "start_selection"
        });

        // 通知で誘導
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'LinkCanvas',
          message: '画面をドラッグして、サムネイルにする範囲を選択してください。'
        });
      } else {
        console.warn("ブックマークしたページが開かれていません。OGPで保存します。");
        saveLinkToApi(settings.apiToken, bookmark.url, bookmark.title, null);
      }
      break;

    case 'viewport':
      // 【ビューポート(全体)モード】の場合
      const [viewportTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      if (viewportTab) {
        chrome.tabs.captureVisibleTab(null, {
          format: 'png'
        }, (dataUrl) => {
          saveLinkToApi(settings.apiToken, bookmark.url, bookmark.title, dataUrl);
        });
      }
      break;

    default:
      // 【OGPモード(デフォルト)】の場合
      // settings.mode が 'ogp' または未設定の場合など
      saveLinkToApi(settings.apiToken, bookmark.url, bookmark.title, null);
      break;
  }
});

// 2. 範囲選択完了メッセージの受信
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "selection_completed") {
    console.log("範囲選択完了:", request.crop);

    const settings = await chrome.storage.sync.get(['apiToken']);
    const tab = sender.tab; // メッセージを送ってきたタブ

    // 画面全体を撮影
    chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
      // 撮影データと切り抜き座標(crop)をセットで送信
      saveLinkToApi(settings.apiToken, tab.url, tab.title, dataUrl, request.crop);
    });
  }
});

// API送信ロジック（共通化）
async function saveLinkToApi(token, url, title, screenshot, crop = null) {
  try {
    const bodyData = {
      api_token: token,
      url: url,
      title: title
    };
    
    if (screenshot) bodyData.screenshot = screenshot;
    if (crop) bodyData.crop = crop;

    const response = await fetch('http://localhost:3000/api/v1/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    if (response.ok) {
      console.log("保存成功");
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'LinkCanvas',
        message: crop ? '範囲選択スクショを保存しました！' : '保存しました！'
      });
    } else {
      console.error("保存失敗");
    }
  } catch (error) {
    console.error("通信エラー:", error);
  }
}