// 範囲選択モードを開始するリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start_selection") {
    startSelection();
  }
});

function startSelection() {
  // 既にオーバーレイがある場合は何もしない
  if (document.getElementById('linkcanvas-overlay')) return;

  // 1. オーバーレイ（画面全体を覆う半透明の幕）を作成
  const overlay = document.createElement('div');
  overlay.id = 'linkcanvas-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: '999999',
    cursor: 'crosshair',
    userSelect: 'none'
  });

  // 2. 選択枠（ドラッグした範囲を示す枠）を作成
  const selectionBox = document.createElement('div');
  Object.assign(selectionBox.style, {
    position: 'fixed',
    border: '2px solid #2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    display: 'none' // 最初は隠しておく
  });
  overlay.appendChild(selectionBox);
  document.body.appendChild(overlay);

  // 座標管理用
  let startX, startY;
  let isSelecting = false;

  // マウスダウン：選択開始
  const onMouseDown = (e) => {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';

    e.preventDefault();
  };

  // マウスムーブ：枠の描画
  const onMouseMove = (e) => {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
  };

  // マウスアップ：選択完了
  const onMouseUp = (e) => {
    if (!isSelecting) return;
    isSelecting = false;

    // 最終的な座標を取得
    const rect = selectionBox.getBoundingClientRect();
    
    // 後片付け
    document.body.removeChild(overlay);

    // 小さすぎる選択（クリックなど）は無視
    if (rect.width < 10 || rect.height < 10) {
      alert("範囲が小さすぎます。もう一度やり直してください。");
      return;
    }

    // バックグラウンドへ座標を送信
    // デバイスピクセル比(Retinaなど)を考慮して座標を補正
    const dpr = window.devicePixelRatio || 1;
    chrome.runtime.sendMessage({
      action: "selection_completed",
      crop: {
        x: rect.left * dpr,
        y: rect.top * dpr,
        width: rect.width * dpr,
        height: rect.height * dpr
      }
    });
  };

  // イベント登録
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
}