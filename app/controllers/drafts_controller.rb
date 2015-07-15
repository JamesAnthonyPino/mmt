class DraftsController < ApplicationController
  before_action :set_draft, only: [:show, :edit, :update, :destroy]

  # GET /drafts
  # GET /drafts.json
  def index
    @drafts = Draft.all
  end

  # GET /drafts/1
  # GET /drafts/1.json
  def show
  end

  # GET /drafts/new
  def new
    draft = Draft.create(user: @current_user)
    redirect_to draft_path(draft)
  end

  # GET /drafts/1/edit
  def edit
    if params[:form]
      @draft_form = params[:form]
      #@draft_form.titleize = @draft_form.titleize()
    else
      render action: 'show'
    end
  end

  # POST /drafts
  # POST /drafts.json
  # def create
  #   @draft = Draft.new(draft_params)
  #
  #   respond_to do |format|
  #     if @draft.save
  #       format.html { redirect_to @draft, notice: 'Draft was successfully created.' }
  #       format.json { render :show, status: :created, location: @draft }
  #     else
  #       format.html { render :new }
  #       format.json { render json: @draft.errors, status: :unprocessable_entity }
  #     end
  #   end
  # end

  # PATCH/PUT /drafts/1
  # PATCH/PUT /drafts/1.json
  def update
    # TODO Each "Save" button will call update to update the draft, and navigate to another form or collection page (show action)
    @draft = Draft.find(params[:id])
    if @draft.update_attributes(draft_params)
      case params[:commit]
      when "Save & Done"
        redirect_to @draft, notice: 'Draft was successfully updated.'
      when "Save & Next"
        # Determine next form to go to
        next_form_name = Draft.get_next_form(params["next-section"])
        redirect_to draft_edit_form_path(@draft, next_form_name)
      else # Jump directly to a form
        next_form_name = params["new_form_name"]
        redirect_to draft_edit_form_path(@draft, next_form_name)
      end
    else # record update failed
      render 'edit'
    end
  end

  # DELETE /drafts/1
  # DELETE /drafts/1.json
  # def destroy
  #   @draft.destroy
  #   respond_to do |format|
  #     format.html { redirect_to drafts_url, notice: 'Draft was successfully destroyed.' }
  #     format.json { head :no_content }
  #   end
  # end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_draft
      id = params[:draft_id] || params[:id]
      @draft_id = id
      @draft = Draft.find(id)
      @draft_forms = Draft::DRAFT_FORMS
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def draft_params
      params.require(:draft).permit(:user_id, :draft, :title)
    end
end
