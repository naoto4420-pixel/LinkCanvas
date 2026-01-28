class Link < ApplicationRecord
  # アソシエーション
  belongs_to        :board
  has_one_attached  :thumbnail    # Active Storageの設定 (サムネイル画像)

  # バリデーション
  validates :url, presence: true

  # 画像リサイズ用のメソッド
  ## 呼び出し時に variant(:thumb) などでサイズ指定できるようにする
  def thumbnail_variant
    return unless thumbnail.attached?
    
    # 300x200のサイズに収まるようにリサイズ（要ImageMagick/Vips）
    # ※エラーが出る場合は一旦 thumbnail をそのまま返す
    thumbnail.variant(resize_to_limit: [300, 200])
  end
end
