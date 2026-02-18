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

        # 保存処理（トランザクションで実行）
        ActiveRecord::Base.transaction do
          # 同じリンクが既にあればそれを使用
          @link = board.links.find_or_initialize_by(url: link_params[:url])
          
          # タイトルは新規作成時のみ、または送られてきた場合のみ更新
          @link.title = link_params[:title] if @link.new_record? || link_params[:title].present?
          
          # メッセージ表示用変数
          message = "保存しました！"

          # 保存画像の設定
          if params[:screenshot].present?
            # スクショ画像が送られてきた場合は差し替え
            @link.thumbnail.purge if @link.thumbnail.attached?

            # Base64データをデコードしてActive Storageに保存
            case attach_screenshot(params[:screenshot], params[:crop].present? ? 'RECT' : 'FULL')
            when 'AS_OK'
                message = params[:crop].present? ? "範囲選択で保存しました！" : "ブラウザのスクリーンショットで保存しました！"
            when 'AS_ALT'
                message = "範囲選択での保存が失敗したため、ブラウザのスクリーンショットで保存しました"
            end
          elsif !@link.thumbnail.attached?
            # 新規作成かつスクショでなくOGP自動取得サービスを実行
            OgpCreator.new(@link).call
          end

          # データ保存
          @link.save!
          render json: { message: message, link: @link }, status: :created

        rescue ActiveRecord::RecordInvalid => e # バリデーションエラーでの保存失敗
          render json: { error: @link.errors.full_messages }, status: :unprocessable_entity
        rescue => e # その他エラー
          Rails.logger.error "Error: #{e.message}"
          render json: { error: "保存中にエラーが発生しました" }, status: :internal_server_error
        end
      end

      def destroy
        # 削除処理（トランザクションで実行）
        ActiveRecord::Base.transaction do
          # urls取得
          urls = params[:urls]

          if urls.present?
            # URLが一致するものはすべて削除
            Link.where(url: urls).destroy_all
            
            render json: { status: 'success', message: '削除しました' }, status: :ok
          else
            render json: { status: 'error', message: '削除するURLが指定されていません' }, status: :unprocessable_entity
          end
        rescue => e
          render json: { status: 'error', message: e.message }, status: :internal_server_error
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
      ## 引数(mode)：'RECT'・・・範囲選択
      ## 　　      ：'FULL'・・・ブラウザ全画面
      ## 戻り値    ： AS_OK・・・正常保存
      ## 　　　    ： AS_ALT・・・代替手段で保存
      def attach_screenshot(base64_data, mode)
        # モード指定が正しくない場合はエラー
        raise ArgumentError, "Invalid mode" unless ['RECT', 'FULL'].include?(mode)

        # ヘッダー部分(data:image/png;base64,)を削除
        file_data = base64_data.split(',').last

        # Base64デコード
        decoded_data = Base64.decode64(file_data)

        # ファイル設定
        filename = "screenshot_#{Time.now.to_i}.png"
          
        # モードで分岐
        case mode
        when 'RECT'
          # 一時ファイル
          temp_file = Tempfile.new([filename, '.png'], binmode: true)

          begin
            temp_file.write(decoded_data)
            temp_file.rewind

            # crop情報取得
            crop_params = params.require(:crop).permit(:x, :y, :width, :height)

            # 画像を選択範囲で切り取る
            processed = ImageProcessing::Vips
              .source(temp_file)
              .crop(crop_params[:x].to_i,
                    crop_params[:y].to_i,
                    crop_params[:width].to_i,
                    crop_params[:height].to_i
              )
              .call

            # 加工後のファイルを読み込んで StringIO に格納してからアタッチ
            ##一時ファイルが消えてもデータが残せる
            @link.thumbnail.attach(
              io: StringIO.new(File.binread(processed.path)),
              filename: filename,
              content_type: 'image/png'
            )

            # ImageProcessingが作った一時ファイルを削除
            processed.close! if processed.respond_to?(:close!)
            
            return 'AS_OK'
          ensure
            # 最初に作った一時ファイルを削除
            temp_file.close!
          end
        when 'FULL' # 通常のスクリーンショットの場合
          # 画像保存
          @link.thumbnail.attach(
            io: StringIO.new(decoded_data),
            filename: filename,
            content_type: 'image/png'
          )

          return 'AS_OK'
        end

      rescue => e
        # mode指定が間違っていたらエラー
        raise e if e.is_a?(ArgumentError)

        # 範囲選択スクリーンショットの保存が失敗したら通常スクリーンショット保存を試行
        begin
          @link.thumbnail.attach(
            io: StringIO.new(decoded_data),
            filename: filename,
            content_type: 'image/png'
          )

          return 'AS_ALT'
        rescue final_error
          # すべてのスクリーンショット保存が失敗したらロールバック
          raise final_error
        end
      end
    end
  end
end