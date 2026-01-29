// 拡張機能がインストールされた時に実行
chrome.runtime.onInstalled.addListener(() => {
  console.log("LinkCanvas Extension installed.");
});

// ブックマークが作成されたイベントを検知
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log("ブックマーク追加を検知しました:", bookmark);
  // 今後、ここにRails APIへの送信処理を書きます
});