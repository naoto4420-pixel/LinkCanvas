// 拡張機能インストール時
chrome.runtime.onInstalled.addListener(() => {
  console.log("LinkCanvas Extension installed.");
});

// ブックマーク作成イベントを監視
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  // フォルダ作成時などはURLがないので無視
  if (!bookmark.url) return;

  console.log("ブックマーク検知:", bookmark);

  // 1. 設定を確認 (トークンがあるか？ 自動保存ONか？)
  const settings = await chrome.storage.sync.get(['apiToken', 'autoSave']);

  if (!settings.apiToken) {
    console.warn("APIトークンが設定されていません。");
    return;
  }

  if (!settings.autoSave) {
    console.log("自動保存がOFFのため、スキップしました。");
    return;
  }

  // 2. Rails APIへ送信
  try {
    const response = await fetch('http://localhost:3000/api/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_token: settings.apiToken,
        url: bookmark.url,
        title: bookmark.title
        // 自動保存はバックグラウンドで行うため、重いスクショ処理は行わずOGP取得に任せる
      }),
    });

    if (response.ok) {
      console.log("LinkCanvasへの自動保存に成功しました！");
      // 成功通知を出す (オプション)
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png', // アイコン画像がない場合はデフォルトアイコンが使われます
        title: 'LinkCanvas',
        message: 'ブックマークを自動保存しました！'
      });
    } else {
      console.error("LinkCanvasへの保存に失敗:", await response.text());
    }
  } catch (error) {
    console.error("通信エラー:", error);
  }
});