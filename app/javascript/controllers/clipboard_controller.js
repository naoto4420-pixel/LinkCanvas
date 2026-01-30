import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "preview", "container"]
  
  async connect() {
    //  クリップボードが読み込めない場合は機能をオフ
    try {
      if (await this.checkPermission() === "denied") {
        //  アクションを外してボタンをグレーアウト
        const eleBtn = document.getElementById('paste_button')
        eleBtn.removeAttribute('data-action')
        eleBtn.classList.replace('bg-purple-600', 'bg-purple-200')
        eleBtn.classList.remove('hover:bg-purple-700', 'transition')
        eleBtn.innerHTML = '<div class="text-gray-200">📋 Paste</div>'


        //  説明文を変更
        const eleInfo = document.getElementById('paste_info')
        eleInfo.innerHTML = 'PC内の画像を選択してください。※クリップボードを使用する場合は、ブラウザの設定から権限を許可してください。'
      }
    } catch (error) {
      console.error(error.message);
    }
  }

  // クリップボード読み込み権限をチェック
  async checkPermission() {
    try {
      const permission = await navigator.permissions.query({
        name: "clipboard-read"
      });
      return permission.state;
    } catch (error) {
      console.error(error.message);
    }
  }

  // ファイル選択時にプレビューを表示
  previewFile() {
    const file = this.inputTarget.files[0]
    this.showPreview(file)
  }

  // クリップボードから貼り付けボタン
  async paste(event) {
    event.preventDefault()

    try {
      // クリップボードの中身を取得
      const clipboardItems = await navigator.clipboard.read()
      
      for (const item of clipboardItems) {
        // 画像タイプを探す
        const imageType = item.types.find(type => type.startsWith('image/'))
        
        if (imageType) {
          const blob = await item.getType(imageType)
          // Fileオブジェクトに変換
          const file = new File([blob], "pasted_image.png", { type: imageType })
          
          // input[type="file"] にデータをセットする魔法（DataTransfer）
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(file)
          this.inputTarget.files = dataTransfer.files

          // プレビュー表示
          this.showPreview(file)
          return
        }
      }
      alert("クリップボードに画像が見つかりませんでした。")
    } catch (err) {
      console.error(err)
      alert("クリップボードの読み取りに失敗しました。")
    }
  }

  showPreview(file) {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      // imgタグを作成してプレビューエリアを書き換え
      this.containerTarget.innerHTML = `<img src="${e.target.result}" class="object-contain w-full h-full rounded">`
    }
    reader.readAsDataURL(file)
  }
}