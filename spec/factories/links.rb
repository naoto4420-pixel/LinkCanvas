FactoryBot.define do
  factory :link do
    url                   { Faker::Internet.url }
    title                 { Faker::Lorem.sentence }
    x_coordinate          { 0.0 }
    y_coordinate          { 0.0 }
    association :board

    # 画像を添付したい場合のトレイト（オプション）
    trait :with_image do
      after(:build) do |link|
        link.thumbnail.attach(
          io: File.open(Rails.root.join('app/assets/images/default_card.png')),
          filename: 'default_card.png',
          content_type: 'image/png'
        )
      end
    end
  end
end