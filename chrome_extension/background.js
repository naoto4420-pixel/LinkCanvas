// インポートファイル
import { API_BASE_URL } from './config.js';

// 拡張機能インストール時
chrome.runtime.onInstalled.addListener(() => {
  console.log("LinkCanvas Extension installed.");
});

// ブックマーク作成イベントを監視
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

// ブックマーク削除イベントを監視
chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
  if (!removeInfo) return;

  // 保存データ取得
  const settings = await chrome.storage.sync.get(['apiToken', 'autoDelete']);

  // 設定チェック
  if (!settings.apiToken) {
    console.warn("APIトークン未設定");
    return;
  }
  if (!settings.autoDelete) {
    console.log("自動削除OFF");
    return;
  } 

  // ブックマークツリーノード取得
  const removeNodes = removeInfo.node;
  
  // 削除するブックマークがあるか確認
  if (removeNodes) {
    
    // 再帰的にすべてのURLを抽出する
    const extractUrls = (node) => {
      let urls = [];
      
      // ノード自体がURLを持っていれば追加（ファイルの場合）
      if (node.url) {
        urls.push(node.url);
      }

      // 子ノードがある場合（フォルダの場合）、再帰的に探索
      if (node.children) {
        node.children.forEach(child => {
          urls = urls.concat(extractUrls(child));
        });
      }
      
      return urls;
    };

    // 削除対象の全URLリストを取得
    const targetUrls = extractUrls(removeNodes);

    // 削除実行
    if (targetUrls.length > 0) {
      deleteLinkToApi(settings.apiToken, targetUrls);
    }
  }
});

// 範囲選択完了メッセージの受信
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
    // データ格納
    const bodyData = {
      api_token: token,
      url: url,
      title: title
    };
    if (screenshot) bodyData.screenshot = screenshot;
    if (crop) bodyData.crop = crop;

    // 送信
    const response = await fetch(`${API_BASE_URL}/api/v1/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    // レスポンス受け取り
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

// 削除ロジック
async function deleteLinkToApi(token, urls) {

  try {
    // データ格納
    const bodyData = {
      api_token: token,
      urls: urls,
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/links`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    });

    if (response.ok) {
      console.log("削除成功");
    } else {
      console.error("削除失敗");
    }
  } catch (error) {
    console.error("通信エラー:", error);
  }
}