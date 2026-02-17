class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  # アソシエーション
  has_many :boards, dependent: :destroy       # ユーザーが消えたらボードも消える

  # バリデーション
  validates :name, presence: true

  # 初回ログイン時にデフォルトボード作成
  after_create :create_default_board
  def create_default_board
    boards.create(name: "未分類")
  end

  # トークン生成ロジック
  before_save :ensure_authentication_token
  def ensure_authentication_token
    self.authentication_token ||= SecureRandom.urlsafe_base64
  end

end
