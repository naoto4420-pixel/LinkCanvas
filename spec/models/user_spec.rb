require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'ユーザー登録' do
    let(:user) { build(:user) }

    context '正常系' do
      it 'name, email, passwordがあれば登録できる' do
        expect(user).to be_valid
      end

      it '登録直後に認証トークンが自動生成される' do
        user.save
        expect(user.authentication_token).to be_present
      end

      it '登録直後に「未分類」ボードが自動作成される' do
        user.save
        # ユーザーに紐づくボードの中に「未分類」があるか確認
        expect(user.boards.exists?(name: '未分類')).to be true
      end
    end

    context '異常系' do
      it 'nameが空だと登録できない' do
        user.name = ''
        user.valid?
        expect(user.errors.full_messages).to include("Name can't be blank")
      end

      it 'passwordが空だと登録できない' do
        user.password = ''
        user.valid?
        expect(user.errors.full_messages).to include("Password can't be blank")
      end

      it 'passwordが短すぎると登録できない' do
        user.password = '12345'
        user.valid?
        expect(user.errors.full_messages).to include("Password confirmation doesn't match Password")
      end

      it 'passwordが長すぎると登録できない' do
        user.password = Faker::Internet.password(min_length: 129, max_length: 130)
        user.valid?
        expect(user.errors.full_messages).to include("Password confirmation doesn't match Password")
      end

      it 'passwordが一致しないと登録できない' do
        user.password_confirmation = 'wrong_password'
        user.valid?
        expect(user.errors.full_messages).to include("Password confirmation doesn't match Password")
      end

      it 'emailが空だと登録できない' do
        user.email = ''
        user.valid?
        expect(user.errors.full_messages).to include("Email can't be blank")
      end

      it '重複したemailは登録できない' do
        user.save
        another_user = build(:user, email: user.email)
        another_user.valid?
        expect(another_user.errors.full_messages).to include("Email has already been taken")
      end
    end
  end
end