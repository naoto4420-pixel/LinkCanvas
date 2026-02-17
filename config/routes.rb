Rails.application.routes.draw do

  # ルートパス
  root to: 'links#index'

  # ルーティング
  resources :links
  resources :boards, except: [:index, :show]
  devise_for :users

  # 拡張機能連携用のAPIルーティング
  namespace :api do
    namespace :v1 do
      resources :links, only: [:create] do
        collection do
          delete :destroy
        end
      end
    end
  end

  # ヘルスチェック用（Rails 7.1以降のデフォルト）
  get "up" => "rails/health#show", as: :rails_health_check

  # 定義されていない全てのパス(*)をルートパスへリダイレクト
  match '*path', to: redirect('/'), via: :all, constraints: lambda { |req|
    req.path.exclude? 'rails/active_storage'
  }
end
