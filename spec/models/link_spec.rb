require 'rails_helper'

RSpec.describe Link, type: :model do
  describe 'リンク保存' do
    let(:user) { create(:user) }
    # ユーザー作成時に自動で作られるボードを使用
    let(:board) { user.boards.first }
    let(:link) { build(:link, board: board) }

    context '正常系' do
      it 'boardとurlがあれば保存できる' do
        expect(link).to be_valid
      end

      it '画像を添付せずに保存すると、デフォルト画像が自動で添付される' do
        # 画像なし状態で保存
        expect(link.thumbnail.attached?).to be false
        link.save
        # 保存後、画像がついているか確認
        expect(link.reload.thumbnail.attached?).to be true
        expect(link.thumbnail.filename.to_s).to eq 'default_card.png'
      end
    end

    context '異常系' do
      it 'urlが空だと保存できない' do
        link.url = ''
        link.valid?
        expect(link.errors.full_messages).to include("Url can't be blank")
      end

      it 'boardが紐付いていないと保存できない' do
        link.board = nil
        link.valid?
        expect(link.errors.full_messages).to include("Board must exist")
      end
    end
  end
end