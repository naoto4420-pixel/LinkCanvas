json.extract! link, :id, :board_id, :url, :title, :x_coordinate, :y_coordinate, :created_at, :updated_at
json.url link_url(link, format: :json)
