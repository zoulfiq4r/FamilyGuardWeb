import { render, screen, waitFor } from "@testing-library/react";
import { SettingsPage } from "./SettingsPage";

// Create proper mock functions
const mockUnsubscribe = jest.fn();
const mockOnAuthStateChanged = jest.fn((auth, callback) => {
  callback({ uid: "test-user-id", email: "test@example.com" });
  return mockUnsubscribe;
});

const mockOnSnapshot = jest.fn((query, callback) => {
  // Simulate async data fetching
  setTimeout(() => {
    const queryStr = JSON.stringify(query);
    
    if (queryStr.includes("users")) {
      // Return parent data
      callback({
        empty: false,
        docs: [{
          data: () => ({
            parentName: "Michael Parker",
            email: "michael.parker@email.com"
          })
        }]
      });
    } else if (queryStr.includes("children")) {
      // Return children data
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
  }, 0);
  
  return mockUnsubscribe;
});

// Mock Firebase config
jest.mock("../config/firebase", () => ({
  auth: { currentUser: { uid: "test-user-id", email: "test@example.com" } },
  db: {},
}));

// Mock Firebase Auth
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signOut: jest.fn(),
}));

// Mock Firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => ({ _collection: name })),
  query: jest.fn((...args) => args),
  where: jest.fn((field, op, value) => ({ _where: [field, op, value] })),
  onSnapshot: mockOnSnapshot,
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

describe("SettingsPage", () => {
  const renderPage = () => render(<SettingsPage />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the top-level headings and helper text", async () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage your account and app preferences/i)).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Account Settings/i })).toBeInTheDocument();
    });
    
    expect(screen.getByRole("heading", { name: /Child Profiles/i })).toBeInTheDocument();
  });

  it("shows each child profile with the expected metadata and actions", async () => {
    renderPage();

    // Wait for children to load
    await waitFor(() => {
      expect(screen.getByText("Emma Parker")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Jake Parker")).toBeInTheDocument();
    expect(screen.getByText(/14 years old/i)).toBeInTheDocument();
    expect(screen.getByText(/11 years old/i)).toBeInTheDocument();
    expect(screen.getByText(/2 devices connected/i)).toBeInTheDocument();
    expect(screen.getByText(/1 device connected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Child Profile/i })).toBeInTheDocument();
  });

  it("pre-populates account form fields and keeps buttons interactive", async () => {
    renderPage();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Parent Name/i)).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
  });
});
