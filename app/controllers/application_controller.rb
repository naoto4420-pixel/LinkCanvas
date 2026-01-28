class ApplicationController < ActionController::Base
  # Deviseのコントローラーが動くときだけ、パラメータ設定メソッドを実行
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  # Devise用追加パラメーター設定
  def configure_permitted_parameters
    # サインアップ時に name を許可
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name])
    # アカウント編集時に name を許可
    devise_parameter_sanitizer.permit(:account_update, keys: [:name])
  end

end
