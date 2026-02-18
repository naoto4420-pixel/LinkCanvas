namespace :extension do
  desc "Chrome拡張機能を本番用URLでビルドしてZIP化する"
  task :pack => :environment do
    require 'zip'

    # 設定
    extension_dir = Rails.root.join('chrome_extension')
    config_file = extension_dir.join('config.js')
    output_zip = Rails.root.join('public', 'linkcanvas-extension.zip')
    
    # URL設定
    dev_url = 'http://localhost:3000'
    prod_url = 'https://linkcanvas-kdc7.onrender.com' 

    puts "📦 拡張機能のパッケージングを開始します..."

    # 1. config.js の内容を読み込む
    original_content = File.read(config_file)

    begin
      # 2. 本番URLに書き換える
      puts "🔄 config.js を本番URL (#{prod_url}) に書き換えています..."
      new_content = original_content.gsub(dev_url, prod_url)
      File.write(config_file, new_content)

      # 3. 古いZIPがあれば削除
      File.delete(output_zip) if File.exist?(output_zip)

      # 4. ZIP圧縮
      puts "🗜 ZIPファイルを作成中..."
      Zip::File.open(output_zip, create: true) do |zipfile|
        Dir.glob(extension_dir.join('**', '*')).each do |file|
          # config.js 以外のファイルも含める
          next if File.directory?(file)
          
          # ZIP内のパスを決める（chrome_extension/ を取り除く）
          zip_path = Pathname.new(file).relative_path_from(extension_dir).to_s
          zipfile.add(zip_path, file)
        end
      end

      puts "✅ ZIP作成完了: public/linkcanvas-extension.zip"

    ensure
      # 5. 必ず元の内容（localhost）に戻す
      puts "↩️ config.js を開発用URLに戻しています..."
      File.write(config_file, original_content)
    end

    puts "🎉 完了しました！"
  end
end