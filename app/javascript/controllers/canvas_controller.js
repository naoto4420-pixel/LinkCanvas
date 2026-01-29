import { Controller } from "@hotwired/stimulus"

// カード1枚ごとに紐づくコントローラー
export default class extends Controller {
  // HTML側から受け取るデータ（リンクID, 初期X座標, 初期Y座標, 更新用URL）
  static values = {
    id: Number,
    x: Number,
    y: Number,
    updateUrl: String
  }

  connect() {
    // 1. 初期位置の設定
    // データベースに保存された座標(x, y)に合わせて、画面上の位置を決定します
    this.element.style.position = 'absolute'
    this.element.style.left = `${this.xValue}px`
    this.element.style.top = `${this.yValue}px`
    
    // ドラッグ中の状態管理用変数
    this.isDragging = false
    this.offsetX = 0
    this.offsetY = 0
  }

  // マウスのボタンを押した時
  dragStart(event) {
    // 左クリック以外は無視
    if (event.button !== 0) return
    
    // リンクなどのクリックを邪魔しないように少し待つ等の処理も可能だが今回はシンプルに
    // event.preventDefault() // ここでpreventDefaultするとリンクが飛べなくなるので注意

    this.isDragging = true
    
    // マウスカーソルと、カードの左上角とのズレを記録
    const rect = this.element.getBoundingClientRect()
    this.offsetX = event.clientX - rect.left
    this.offsetY = event.clientY - rect.top

    // カードを最前面に持ってくる（重なり順を上げる）
    this.element.style.zIndex = 1000
    this.element.style.cursor = 'grabbing'

    // 画面全体でマウスの動きを監視開始
    window.addEventListener('mousemove', this.drag)
    window.addEventListener('mouseup', this.dragEnd)
  }

  // マウスを動かしている時（アロー関数でthisを固定）
  drag = (event) => {
    if (!this.isDragging) return

    event.preventDefault() // テキスト選択などを防ぐ

    // 新しい位置を計算
    const x = event.clientX - this.offsetX
    // ヘッダーの高さなどを考慮する必要があるが、今回は簡易的に計算
    // 親要素（キャンバス）からの相対位置に変換
    const parentRect = this.element.parentElement.getBoundingClientRect()
    
    let newX = event.clientX - parentRect.left - this.offsetX
    let newY = event.clientY - parentRect.top - this.offsetY

    // 画面外にはみ出さないように制御（オプション）
    newX = Math.max(0, newX)
    newY = Math.max(0, newY)

    // スタイルを適用して移動させる
    this.element.style.left = `${newX}px`
    this.element.style.top = `${newY}px`
    
    // 現在値を更新
    this.xValue = newX
    this.yValue = newY
  }

  // マウスを離した時
  dragEnd = () => {
    if (!this.isDragging) return
    
    this.isDragging = false
    this.element.style.zIndex = 1 // 重なり順を戻す
    this.element.style.cursor = 'grab'

    // 監視を解除
    window.removeEventListener('mousemove', this.drag)
    window.removeEventListener('mouseup', this.dragEnd)

    // 2. 座標をサーバーに保存
    this.savePosition()
  }

  // RailsのAPIを叩いて座標をUPDATEする
  async savePosition() {
    const url = this.updateUrlValue
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Accept': 'application/json' // JSONでレスポンスを期待
        },
        body: JSON.stringify({
          link: {
            x_coordinate: this.xValue,
            y_coordinate: this.yValue
          }
        })
      })

      if (response.ok) {
        console.log(`Link ${this.idValue} saved: (${this.xValue}, ${this.yValue})`)
      } else {
        console.error('Save failed')
      }
    } catch (error) {
      console.error('Network error:', error)
    }
  }
}