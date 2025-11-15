import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  const renderPage = () => render(<SettingsPage />);

  it("renders the top-level headings and helper text", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage your account and app preferences/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Account Settings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Child Profiles/i })).toBeInTheDocument();
  });

  it("shows each child profile with the expected metadata and actions", () => {
    renderPage();

    expect(screen.getByText("Emma Parker")).toBeInTheDocument();
    expect(screen.getByText("Jake Parker")).toBeInTheDocument();
    expect(screen.getByText(/14 years old/i)).toBeInTheDocument();
    expect(screen.getByText(/11 years old/i)).toBeInTheDocument();
    expect(screen.getByText(/2 devices connected/i)).toBeInTheDocument();
    expect(screen.getByText(/1 device connected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Child Profile/i })).toBeInTheDocument();
  });

  it("pre-populates account form fields and keeps buttons interactive", async () => {
    const user = userEvent;
    renderPage();

    expect(screen.getByLabelText(/First Name/i)).toHaveValue("Michael");
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue("Parker");
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue("michael.parker@email.com");

    const changePhotoButton = screen.getByRole("button", { name: /Change Photo/i });
    await user.click(changePhotoButton);
    expect(changePhotoButton).toHaveFocus();
  });
});
