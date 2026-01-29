module Api
  module V1
    class LinksController < ActionController::API
      # トークンによるユーザー認証
      before_action :authenticate_user_from_token!

      def create
        # ボードの特定（ユーザーが持っているボードの最初の1つ、または指定されたID）
        # ※本来は拡張機能側でボードを選択させますが、まずは「最初のボード」に保存します
        board = @current_user.boards.first

        unless board
          render json: { error: "ボードが見つかりません。先にWebアプリでボードを作成してください。" }, status: 404
          return
        end

        @link = board.links.build(link_params)

        # スクショ画像が送られてきた場合
        if params[:screenshot].present?
          # Base64データをデコードしてActive Storageに保存
          attach_screenshot(params[:screenshot])
        else
          # スクショがない場合はOGP自動取得サービスを実行
          OgpCreator.new(@link).call
        end

        if @link.save
          # 保存時に画像がなければ、強制的にデフォルト画像を付ける
          ensure_thumbnail_attached(@link)

          render json: { message: "保存しました！", link: @link }, status: :created
        else
          render json: { error: @link.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def link_params
        params.permit(:url, :title)
      end

      def authenticate_user_from_token!
        token = params[:api_token]
        @current_user = User.find_by(authentication_token: token)

        unless @current_user
          render json: { error: "認証失敗: 正しいAPIトークンを送ってください" }, status: :unauthorized
        end
      end

      # Base64文字列("data:image/png;base64,.....")を画像ファイルとして保存する処理
      def attach_screenshot(base64_data)
        # ヘッダー部分(data:image/png;base64,)を削除
        data_index = base64_data.index('base64') + 7
        file_data = base64_data[data_index..-1]
        decoded_data = Base64.decode64(file_data)

        # 一時ファイルとして保存してからattach
        filename = "screenshot_#{Time.now.to_i}.png"
        @link.thumbnail.attach(
          io: StringIO.new(decoded_data),
          filename: filename,
          content_type: 'image/png'
        )
      end

      # デフォルト画像添付用メソッド
      def ensure_thumbnail_attached(link)
        # 画像が添付されており、かつ一般的な画像形式(JPEG/PNG/GIF)なら何もしない
        if link.thumbnail.attached?
          if link.thumbnail.content_type.in?(%w[image/jpeg image/png image/gif])
            return
          else
            # SVGなどリサイズできない形式の場合は、一度削除してデフォルト画像に置き換える
            Rails.logger.warn "Unsupported image type detected: #{link.thumbnail.content_type}. Replacing with default."
            link.thumbnail.purge
          end
        end

        # デフォルト画像のパス
        default_path = Rails.root.join('app/assets/images/default_card.png')

        # ファイルが存在すれば添付する
        if File.exist?(default_path)
          link.thumbnail.attach(
            io: File.open(default_path),
            filename: 'default_card.png',
            content_type: 'image/png'
          )
        end
      rescue => e
        Rails.logger.error "Default image attach failed: #{e.message}"
      end
    end
  end
end