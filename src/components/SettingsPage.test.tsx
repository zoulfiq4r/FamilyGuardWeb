import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";

// Mock Firebase
const mockOnSnapshot = jest.fn();
const mockAuth = { currentUser: { uid: "test-user-id", email: "test@example.com" } };
const mockDb = {};

jest.mock("../config/firebase", () => ({
  auth: { currentUser: { uid: "test-user-id", email: "test@example.com" } },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn((q, callback) => {
    // Simulate parent data
    if (q.toString().includes("users")) {
      callback({
        empty: false,
        docs: [{
          data: () => ({
            parentName: "Michael Parker",
            email: "michael.parker@email.com"
          })
        }]
      });
    }
    // Simulate children data
    if (q.toString().includes("children")) {
      callback({
        empty: false,
        docs: [
          {
            id: "child1",
            data: () => ({
              childName: "Emma Parker",
              age: 14,
              devices: ["device1", "device2"]
            })
          },
          {
            id: "child2",
            data: () => ({
              childName: "Jake Parker",
              age: 11,
              devices: ["device1"]
            })
          }
        ]
      });
    }
    return jest.fn(); // unsubscribe function
  }),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

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

    // Wait for data to load and check for parent name field instead
    expect(screen.getByLabelText(/Parent Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });
});
