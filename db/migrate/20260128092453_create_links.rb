class CreateLinks < ActiveRecord::Migration[7.1]
  def change
    create_table :links do |t|
      t.references  :board,         null: false, foreign_key: true
      t.text        :url,           null: false
      t.string      :title
      t.float       :x_coordinate,  default: 0.0
      t.float       :y_coordinate,  default: 0.0

      t.timestamps
    end
  end
end
