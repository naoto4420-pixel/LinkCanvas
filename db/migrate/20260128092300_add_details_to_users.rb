class AddDetailsToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :name,                 :string, null: false
    add_column :users, :authentication_token, :string
    add_index  :users, :authentication_token, unique: true
  end
end
