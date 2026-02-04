class ApplicationController < ActionController::Base
  # Deviseのコントローラーが動くときだけ、パラメータ設定メソッドを実行
  before_action :configure_permitted_parameters, if: :devise_controller?
  # 本番環境のみBasic認証をかける
  before_action :basic_auth, if: :production?

  protected

  # Devise用追加パラメーター設定
  def configure_permitted_parameters
    # サインアップ時に name を許可
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name])
    # アカウント編集時に name を許可
    devise_parameter_sanitizer.permit(:account_update, keys: [:name])
  end

  def production?
    Rails.env.production?
  end

  def basic_auth
    authenticate_or_request_with_http_basic do |username, password|
      username == ENV["BASIC_AUTH_USER"] && password == ENV["BASIC_AUTH_PASSWORD"]
    end
  end
end
