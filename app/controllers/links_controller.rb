class LinksController < ApplicationController
  before_action :set_link, only: %i[ show edit update destroy ]

  # GET /links or /links.json
  def index
    # パラメータに board_id がある場合、そのボードのリンクだけを取得
    if params[:board_id]
      # 自分のボードの中から探す（他人のボードは見れないようにする）
      @board = current_user.boards.find(params[:board_id])
      @links = @board.links
    else
      # ボード指定がない場合（直接 /links にアクセスした場合など）
      # ユーザーがボードを持っていれば、最初のボードに自動転送する
      first_board = current_user.boards.first
      if first_board
        redirect_to links_path(board_id: first_board.id)
      else
        # ボードが1つもない場合は空の配列
        @links = []
      end
    end
  rescue ActiveRecord::RecordNotFound
    # 存在しないボードIDが指定された場合はボード一覧へ戻す
    redirect_to boards_path, alert: "ボードが見つかりませんでした。"
  end

  # GET /links/1 or /links/1.json
  def show
  end

  # GET /links/new
  def new
    @link = Link.new
  end

  # GET /links/1/edit
  def edit
  end

  # POST /links or /links.json
  def create
    @link = Link.new(link_params)

    # OGP取得サービスを呼び出す
    OgpCreator.new(@link).call
    
    respond_to do |format|
      if @link.save
        format.html { redirect_to @link, notice: "Link was successfully created." }
        format.json { render :show, status: :created, location: @link }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @link.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /links/1 or /links/1.json
  def update
    # トランザクション内で更新と画像再取得を行う（URLが変わった場合など）
    url_changed = link_params[:url] != @link.url

    respond_to do |format|
      if @link.update(link_params)
        # URLが変更されていたらOGPも再取得する
        OgpCreator.new(@link).call if url_changed && @link.save

        format.html { redirect_to @link, notice: "Link was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @link }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @link.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /links/1 or /links/1.json
  def destroy
    @link.destroy!

    respond_to do |format|
      format.html { redirect_to links_path, notice: "Link was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
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
