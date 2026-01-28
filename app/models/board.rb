class Board < ApplicationRecord
  # アソシエーション
  belongs_to  :user
  has_many    :links, dependent: :destroy      # ボードが消えたらリンクも消える

  # バリデーション
  validates :name, presence: true

end
