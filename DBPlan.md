#DB設計書

|Users テーブル| | | |
|:----|:----|:----|:----|
|ユーザー情報を管理。| | | |
| | | | |
|カラム名             |型    |オプション          |説明                  |
|name                |string|null: false        |ユーザー名（表示用）    |
|email               |string|null: false, unique|ログイン用メールアドレス|
|encrypted_password  |string|null: false        |Devise用パスワード     |
|authentication_token|string|unique             |API連携用トークン      |

・アソシエーション  
has_many :boards, dependent: :destroy


|Boards テーブル| | | |
|:----|:----|:----|:----|
|リンクをまとめるキャンバス。| | | |
| | | | |
|カラム名|型        |オプション      |説明       |
|user_id|references|null: false, FK|所有ユーザー|
|name   |string    |null: false    |ボード名   |

・アソシエーション  
has_many :links, dependent: :destroy


|Links テーブル| | | |
|:----|:----|:----|:----|
|個々のブックマークカード。| | | |
| | | | |
|カラム名     |型        |オプション      |説明         |
|board_id    |references|null: false, FK|所属ボード    |
|url         |text      |null: false    |リンク先URL   |
|title       |string    |               |サイトタイトル|
|x_coordinate|float     |default: 0     |X座標位置     |
|y_coordinate|float     |default: 0     |Y座標位置     |  

※画像データはActive Storageのテーブルで管理されるため、ここにカラムは不要。

・アソシエーション  
has_one_attached :thumbnail



