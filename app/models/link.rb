class Link < ApplicationRecord
  # アソシエーション
  belongs_to        :board
  has_one_attached  :thumbnail    # Active Storageの設定 (サムネイル画像)

  # バリデーション
  validates :url, presence: true
  
end
