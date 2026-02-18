require 'rails_helper'

RSpec.describe Board, type: :model do
  describe 'ボード作成' do
    let(:user) { create(:user) }
    let(:board) { build(:board, user: user) }

    context '正常系' do
      it 'userとnameがあれば作成できる' do
        expect(board).to be_valid
      end
    end

    context '異常系' do
      it 'nameが空だと作成できない' do
        board.name = ''
        board.valid?
        expect(board.errors.full_messages).to include("Name can't be blank")
      end

      it 'userが紐付いていないと作成できない' do
        board.user = nil
        board.valid?
        expect(board.errors.full_messages).to include("User must exist")
      end
    end
  end
end