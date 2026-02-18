require 'open-uri'

# ブックマークURLのOGP取得
class OgpCreator
  def initialize(link)
    @link = link
  end

  def call
    return unless @link.url.present?

    # ▼ブラウザのふりをするための User-Agent 設定
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    # URLからWebページ情報を取得 (User-Agentを指定)
    page = MetaInspector.new(@link.url, headers: { 'User-Agent' => user_agent })

    # タイトルがまだなければ、ページのタイトルを設定
    @link.title = page.best_title if @link.title.blank?

    # 画像URLを取得 (OGP > imgタグ > favicon の順で探す)
    image_url = page.images.best

    if image_url.present?
      attach_image_from_url(image_url, user_agent)
    end
  rescue => e
    # エラー時はログに出力
    Rails.logger.error "OgpCreator Error: #{e.message}"
  end

  private

  def attach_image_from_url(url, user_agent)
    # URLから画像をダウンロード
    downloaded_image = URI.open(url, "User-Agent" => user_agent)
    
    # Active Storageにファイルを保存
    @link.thumbnail.attach(io: downloaded_image, filename: "ogp_image.jpg")
  rescue => e
    # エラー時はログに出力
    Rails.logger.error "Image Download Error: #{e.message}"
  end

end