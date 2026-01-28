require 'open-uri'

# ブックマークURLのOGP取得
class OgpCreator
  def initialize(link)
    @link = link
  end

  def call
    return unless @link.url.present?

    # URLからWebページ情報を取得
    page = MetaInspector.new(@link.url)

    # タイトルがまだなければ、ページのタイトルを設定
    @link.title = page.best_title if @link.title.blank?

    # 画像URLを取得 (OGP > imgタグ > favicon の順で良さげなものを探す)
    image_url = page.images.best

    if image_url.present?
      attach_image_from_url(image_url)
    else
      attach_default_image
    end
  rescue => e
    # エラー時はログに出力してデフォルト画像を設定
    Rails.logger.error "OgpCreator Error: #{e.message}"
    attach_default_image
  end

  private

  def attach_image_from_url(url)
    # URLから画像をダウンロード
    downloaded_image = URI.open(url)
    
    # Active Storageにファイルを添付
    @link.thumbnail.attach(io: downloaded_image, filename: "ogp_image.jpg")
  rescue => e
    Rails.logger.error "Image Download Error: #{e.message}"
    attach_default_image
  end

  def attach_default_image
    # 画像が取れなかった時のフォールバック画像
    default_path = Rails.root.join('app/assets/images/default_card.png')

    if File.exist?(default_path)
      @link.thumbnail.attach(
        io: File.open(default_path),
        filename: 'default_card.png',
        content_type: 'image/png'
      )
    end
  end
end