class LinksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_link, only: %i[ edit update destroy ]

  # GET /links or /links.json
  def index

    # ボード一覧を取得
    @boards = current_user.boards.order(:created_at)

    # パラメータに board_id がある場合、そのボードのリンクだけを取得
    if params[:board_id]
      # 自分のボードの中から探す（他人のボードは見れないようにする）
      @active_board = current_user.boards.find(params[:board_id])
      @links = @active_board.links
    end

    # ボード指定がない場合（直接 /links にアクセスした場合など）
    # 最初のボードに自動転送する
    @active_board ||= @boards.first

    # ボードのリンク格納
    @links = @active_board&.links
  end

  # GET /links/new
  def new
    @link = Link.new
    @link.board_id = params[:board_id]
  end

  # GET /links/1/edit
  def edit
  end

  # POST /links or /links.json
  def create
    @link = Link.new(link_params)

    # 画像指定がなければOGP取得サービスを呼び出す
    OgpCreator.new(@link).call if !link_params.key?(:thumbnail)
    
    respond_to do |format|
      if @link.save
        format.html { redirect_to links_path(board_id: @link.board_id), notice: "Link was successfully created.", status: :see_other }
      else
        format.html { render :new, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /links/1 or /links/1.json
  def update
    # URL更新判定
    url_changed = link_params.key?(:url) && (link_params[:url] != @link.url)

    # 画像更新判定
    thumbnail_changed = link_params.key?(:thumbnail) && (link_params[:thumbnail] != @link.thumbnail)

    respond_to do |format|
      if @link.update(link_params)
        # URLが変更された場合、画像指定がなければOGP画像で更新する
        OgpCreator.new(@link).call if url_changed && !thumbnail_changed

        format.html { redirect_to links_path(board_id: @link.board_id), notice: "Link was successfully updated.", status: :see_other }
        format.json { render json: @link, status: :ok, location: @link }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @link.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /links/1 or /links/1.json
  def destroy
    board_id = @link.board_id
    @link.destroy!

    respond_to do |format|
      format.html { redirect_to links_path(board_id: board_id), notice: "Link was successfully destroyed.", status: :see_other }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_link
      @link = Link.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def link_params
      params.require(:link).permit(:board_id, :url, :title, :x_coordinate, :y_coordinate, :thumbnail)
    end
end
