class Link < ApplicationRecord
  # アソシエーション
  belongs_to        :board
  has_one_attached  :thumbnail    # Active Storageの設定 (サムネイル画像)

  # バリデーション
  validates :url, presence: true

  # 保存前に画像の状態をチェックする
  before_save :ensure_correct_thumbnail

  # 作成・更新・削除時にリアルタイム配信を行う
  after_create_commit do
    reload
    broadcast_append_to board
  end

  after_update_commit do
    reload
    broadcast_replace_to board
  end

  after_destroy_commit { broadcast_remove_to board }

  # 画像リサイズ用のメソッド
  ## 呼び出し時に variant(:thumb) などでサイズ指定できるようにする
  def thumbnail_variant
    return unless thumbnail.attached?
    
    # 300x200のサイズに収まるようにリサイズ（要ImageMagick/Vips）
    # ※エラーが出る場合は一旦 thumbnail をそのまま返す
    thumbnail.variant(resize_to_limit: [300, 200])
  end

  private

  # 使用できない画像の時にデフォルト画像をセットする
  def ensure_correct_thumbnail
    # 画像が既に添付されている場合
    if thumbnail.attached?
      # 形式が JPEG, PNG, GIF 以外（SVGなど）なら、不適切として削除する
      unless thumbnail.content_type.in?(%w[image/jpeg image/png image/gif image/webp])
        thumbnail.purge
      end
    end

    # 画像が無い（または削除された）場合、デフォルト画像を添付する
    unless thumbnail.attached?
      default_path = Rails.root.join('app/assets/images/default_card.png')
      if File.exist?(default_path)
        thumbnail.attach(
          io: File.open(default_path),
          filename: 'default_card.png',
          content_type: 'image/png'
        )
      end
    end
  rescue => e
    Rails.logger.error "Thumbnail check failed: #{e.message}"
  end

end
