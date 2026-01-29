Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 開発中は、拡張機能や外部からのアクセスをすべて許可するため '*' を指定。
    # ※本番環境へデプロイする際は、セキュリティ向上のため拡張機能のIDやドメインを指定する。
    origins '*'

    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end