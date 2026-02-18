FactoryBot.define do
  factory :board do
    name                { "マイボード" }
    association :user
  end
end