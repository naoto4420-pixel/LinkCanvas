require "application_system_test_case"

class LinksTest < ApplicationSystemTestCase
  setup do
    @link = links(:one)
  end

  test "visiting the index" do
    visit links_url
    assert_selector "h1", text: "Links"
  end

  test "should create link" do
    visit links_url
    click_on "New link"

    fill_in "Board", with: @link.board_id
    fill_in "Title", with: @link.title
    fill_in "Url", with: @link.url
    fill_in "X coordinate", with: @link.x_coordinate
    fill_in "Y coordinate", with: @link.y_coordinate
    click_on "Create Link"

    assert_text "Link was successfully created"
    click_on "Back"
  end

  test "should update Link" do
    visit link_url(@link)
    click_on "Edit this link", match: :first

    fill_in "Board", with: @link.board_id
    fill_in "Title", with: @link.title
    fill_in "Url", with: @link.url
    fill_in "X coordinate", with: @link.x_coordinate
    fill_in "Y coordinate", with: @link.y_coordinate
    click_on "Update Link"

    assert_text "Link was successfully updated"
    click_on "Back"
  end

  test "should destroy Link" do
    visit link_url(@link)
    accept_confirm { click_on "Destroy this link", match: :first }

    assert_text "Link was successfully destroyed"
  end
end
