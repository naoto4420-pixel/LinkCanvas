import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["modal"]

  // モーダルを開く
  open(){
    this.modalTarget.classList.remove('hidden')
  }

  // モーダルを閉じる
  close(){
    this.modalTarget.classList.add('hidden')
  }

  // 背景をクリックしたらモーダルを閉じる
  backgroundClick(e){
    if (e.target === this.modalTarget) {
      this.close()
    }
  }
}
