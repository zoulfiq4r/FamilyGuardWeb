import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthScreen } from "./AuthScreen";

const mockSignIn = jest.fn();
const mockCreateUser = jest.fn();
const mockAddDoc = jest.fn();
const mockCollection = jest.fn(() => "users-collection");
const mockServerTimestamp = jest.fn(() => "timestamp");

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: Parameters<typeof mockSignIn>) =>
    mockSignIn(...args),
  createUserWithEmailAndPassword: (...args: Parameters<typeof mockCreateUser>) =>
    mockCreateUser(...args),
}));

jest.mock("firebase/firestore", () => ({
  collection: (...args: Parameters<typeof mockCollection>) =>
    mockCollection(...args),
  addDoc: (...args: Parameters<typeof mockAddDoc>) => mockAddDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock("../config/firebase", () => ({
  auth: { mocked: true },
  db: { mocked: true },
}));

describe("AuthScreen", () => {
  const renderAuth = () => render(<AuthScreen />);

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue("users-collection");
    mockServerTimestamp.mockReturnValue("timestamp");
  });

  it("toggles between login and registration views", async () => {
    const user = userEvent;
    renderAuth();

    expect(screen.getByText(/Parent Login/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Need an account\? Register/i })
    );

    expect(screen.getByText(/Create Parent Account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Parent Name/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Have an account\? Sign in/i })
    );
    expect(screen.getByText(/Parent Login/i)).toBeInTheDocument();
  });

  it("submits login credentials through Firebase auth", async () => {
    const user = userEvent;
    mockSignIn.mockResolvedValueOnce({});

    renderAuth();
    await user.type(screen.getByLabelText(/Email/i), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith(
        { mocked: true },
        "parent@example.com",
        "hunter2"
      )
    );
  });

  it("validates matching passwords before registration", async () => {
    const user = userEvent;
    renderAuth();

    await user.click(
      screen.getByRole("button", { name: /Need an account\? Register/i })
    );

    await user.type(screen.getByLabelText(/Email/i), "parent@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "secret1");
    await user.type(screen.getByLabelText(/Confirm Password/i), "secret2");
    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    expect(
      screen.getByText(/Passwords do not match/i)
    ).toBeInTheDocument();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("creates a user and stores metadata in Firestore when registering", async () => {
    const user = userEvent;
    mockCreateUser.mockResolvedValueOnce({ user: { uid: "new-parent" } });
    mockAddDoc.mockResolvedValueOnce(undefined);

    renderAuth();
    await user.click(
      screen.getByRole("button", { name: /Need an account\? Register/i })
    );

    await user.type(screen.getByLabelText(/Parent Name/i), "Jamie");
    await user.type(screen.getByLabelText(/Email/i), "jamie@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "secret1");
    await user.type(screen.getByLabelText(/Confirm Password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() =>
      expect(mockCreateUser).toHaveBeenCalledWith(
        { mocked: true },
        "jamie@example.com",
        "secret1"
      )
    );

    await waitFor(() =>
      expect(mockAddDoc).toHaveBeenCalledWith("users-collection", {
        userId: "new-parent",
        email: "jamie@example.com",
        parentName: "Jamie",
        role: "parent",
        createdAt: "timestamp",
      })
    );

    expect(mockCollection).toHaveBeenCalledWith({ mocked: true }, "users");
    expect(mockServerTimestamp).toHaveBeenCalled();
  });
});
